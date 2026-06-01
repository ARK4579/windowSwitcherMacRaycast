import { runAppleScript } from "@raycast/utils";
import { writeFileSync } from "fs";

const script = `
on debugLog(msg)
  -- In normal use we don't have to log anything
  -- do shell script "echo " & quoted form of msg & " >> /tmp/raycast_debug.log"
end debugLog

on joinList(theList, delim)
  set AppleScript's text item delimiters to delim
  set joined to theList as string
  set AppleScript's text item delimiters to ""
  return joined
end joinList

on sortByName(theList)
  set sorted to {}
  repeat with c in theList
    set inserted to false
    repeat with j from 1 to count of sorted
      if (name of c) < (name of item j of sorted) then
        if j > 1 then
          set sorted to (items 1 thru (j - 1) of sorted) & {c} & (items j thru -1 of sorted)
        else
          set sorted to {c} & (items j thru -1 of sorted)
        end if
        set inserted to true
        exit repeat
      end if
    end repeat
    if not inserted then
      set end of sorted to c
    end if
  end repeat
  return sorted
end sortByName

on getRotationIndex(frontProcName, totalCount, direction)
  set stateFile to "/tmp/winswitch_" & frontProcName & ".txt"
  set idx to 1
  try
    set idx to (do shell script "cat " & stateFile) as integer
  on error errMsg
    my debugLog("  ⚠️  Error getRotationIndex: " & errMsg)
  end try
  
  -- advance index
  if direction is "last"
    set nextIdx to 2
    set saveNextIdx to 1
  else if direction is "next"
    set nextIdx to (idx mod totalCount) + 1
    set saveNextIdx to nextIdx
  else if direction is "prev"
    set nextIdx to idx - 1
    if nextIdx < 1 then
      set nextIdx to totalCount
    end if
    set saveNextIdx to nextIdx
  end if
  try
    do shell script "echo " & saveNextIdx & " > " & stateFile
  on error errMsg
    my debugLog("  ⚠️  Error getRotationIndex: " & errMsg)
  end try
  return nextIdx
end getRotationIndex

on run argv
  set direction to "last"
  set mode to "focused"
  if (count of argv) > 0 then set direction to item 1 of argv
  if (count of argv) > 1 then set mode to item 2 of argv

  my debugLog("switch.application direction: " & direction & ", mode: " & mode)

  set directions to {"last", "next", "prev"}
  if direction is not in directions then
    my debugLog("Unknown value for direction: " & joinList(directions, ", "))
    return
  end if

  set modes to {"visible", "focused"}
  if mode is not in modes then
    my debugLog("Unknown value for mode: " & joinList(modes, ", "))
    return
  end if

  focusWindowInZone(direction, mode)
  my debugLog("Done.")
end run

on focusWindowInZone(direction, mode)
  set candidateWin to missing value
  set candidateProc to missing value
  set fallbackWin to missing value
  set fallbackProc to missing value
  set foundCount to 0

  tell application "System Events"
    -- grab frontmost process + all its windows
    set frontProc to first process whose frontmost is true
    set wins to windows of frontProc
    set winCount to count of wins

    if winCount < 2 then
      my debugLog("Process doesn't have enough windows to cycle. winCount: " & winCount)
      return
    end if

    set allPos to position of every window of frontProc
    set allSz to size of every window of frontProc
    set allNames to name of every window of frontProc

    -- get focused screen offset if mode is not visible, otherwise we won't need it
    if mode is not "visible" then
      set fPos to item 1 of allPos
      set fSz to item 1 of allSz
      set sPos to item 1 of fPos
      set sSz to item 1 of fSz
      -- calculate center point of focused window which we will use to determine focused display
      set focusX to sPos + (sSz / 2)

      set screenLeft to 0
      set screenRight to 0
      set screenTop to 0
      set screenBottom to 0

      -- get screen dimensions
      set jxa to "ObjC.import('AppKit'); var screens = $.NSScreen.screens; var out = []; for (var i = 0; i < screens.count; i++) { var f = screens.objectAtIndex(i).frame; out.push(f.origin.x + ',' + f.origin.y + ',' + f.size.width + ',' + f.size.height); } out.join('\\\\n');"
      set screensRaw to do shell script "osascript -l JavaScript -e " & quoted form of jxa
      set screenLines to paragraphs of screensRaw
      set numDisplays to (count of screenLines)

      -- find focused screen
      repeat with sLine in screenLines
        if sLine is not "" then
          set AppleScript's text item delimiters to ","
          set parts to text items of sLine
          set AppleScript's text item delimiters to ""
          set dLeft to (item 1 of parts) as number
          set dTop to (item 2 of parts) as number
          set dW to (item 3 of parts) as number
          set dH to (item 4 of parts) as number
          -- NOTE: NSScreen uses bottom-left origin; convert to top-left (flip Y)
          -- Total height needed for flip = sum of all screens is complex,
          -- so instead match by X range only for width, use focusX heuristic
          set dRight to dLeft + dW
          -- for now we are only using x-axis to determine focused screen
          if dLeft <= focusX and focusX < dRight then
            set screenLeft to dLeft
            set screenRight to dLeft + dW
            set screenTop to dTop
            set screenBottom to dTop + dH
          end if
        end if
      end repeat
      my debugLog("screenLeft: " & screenLeft & ", screenTop: " & screenTop & ", screenRight: " & screenRight & ", screenBottom: " & screenBottom)
    end if

    -- get windows that we need to iterate from as candidates
    set candidates to {}
    repeat with i from 1 to winCount
        set addWin to false
        set wName to item i of allNames
        if mode is "visible" then
          set addWin to true
        else
          set wPos to item i of allPos
          set wSz to item i of allSz
          set wLeft to item 1 of wPos
          set wTop to item 2 of wPos
          set ww to item 1 of wSz
          set wh to item 2 of wSz
          set wFocusX to (wLeft + (ww/2))
          set wFocusY to (wTop + (wh/2))
          my debugLog(wName & " wFocusX: " & wFocusX & ", wFocusY: " & wFocusY)
          if screenLeft < wFocusX and wFocusX < screenRight then
            if screenTop < wFocusY and wFocusY < screenBottom then
              my debugLog("adding window...")
              set addWin to true
            end if
          end if
        end if
        if addWin is true then
          set end of candidates to {idx:i, theWin:(item i of wins), name:wName}
        end if
    end repeat

    set candidateCount to count of candidates
    my debugLog("candidates count: " & candidateCount)
    if candidateCount < 2 then
      my debugLog("less than 2 candidateCount: " & candidateCount)
      return
    end if

    -- actually, switch to next window based on direction
    if direction is not "last" then
      -- if direction is not "last", then we sort windows by name so that order is preserved across concurrent command runs
      set candidates to my sortByName(candidates)
    end if
    set frontProcName to name of frontProc
    set nextIdx to my getRotationIndex(frontProcName, candidateCount, direction)
    set nextCand to item nextIdx of candidates
    my debugLog("nextIdx: " & nextIdx & ", window: " & (name of nextCand))
    set frontmost of frontProc to true
    perform action "AXRaise" of (theWin of nextCand)
  end tell
end focusWindowInZone
`;

function debug(msg: string) {
  writeFileSync("/tmp/raycast_debug.log", `${new Date().toISOString()} ${msg}\n`, { flag: "a" });
}

export default async function switchWindow(props: { arguments: { direction: string, mode: string } }) {
  const { direction, mode } = props.arguments;
  try {
    await runAppleScript(script, [direction, mode]);
  } catch (e) {
    const errMsg = (e as Error).message;
    debug(errMsg)
  }
}
