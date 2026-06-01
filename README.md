# Switch Window of Same App on Same Monitor

Switch Window of Same App on Same Monitor

## Problem 

This extension aims to solve this problem:

Let's say I have 3 "Desktops" setup on my primary mac display, with focus on various projects like backend, frontend and data engg. In all projects, I have to use an IDE, let's call it "arkode".

But now I have another project 'support' that I want to be able to work in parallel with other projects.

So, I connect an external display and open this support project on this external display.

This adds a "Desktop 4" to this external display while "Desktop 1", "Desktop 2" and "Desktop 3" are on primary mac display.

Now, on primary_display/"Desktop 3", I have two arkode windows related to backend and on external_display/"Desktop 4", I have two arkode windows related to support.

Here is the issue:

When I am on a backend arkode window and do `command+~` to loop through other open arkode windows it goes through all windows of arkode instead of just 2 backend related windows on primary_display/"Desktop 3" as I had wanted because my current focus was on backend project. I just want to iterate thorough backend related arkode windows.

So, I find this default mac behaviour very annoying and wanted a shortcut using which I can just loop thorough other windows on same physical display/desktop only.

This extension provides commands to do just that.

## Solution

This extension provides 6 commands (combination of 2 parameters) using any of which you can easily switch between various windows of same app.

The two parameter are:
* `direction`: which window to switch to next
  - `last`: last opened window. if you have 2+ windows you can use these commands to switch between 2 windows that you are actively working on.
  - `next`: move to next window. if on last window, move to first window
  - `prev`: move to previous window. if on first window, move to last window
* `mode`:
  - `focused`: switches between windows on same (currently focused) physical display and desktop
  - `visible`: switches between windows on currently visible displays/desktops (so in above example that would be Desktop 3 and Desktop 4)

and so the commands are `switch-window-<direction>-<mode>`. You can add shortcuts to commands you would need the most.

## setup

1. Install required node packages

```bash
npm install
```

## build & use

1. Run this command to build to dist directory

```bash
npm run build
```

2. Open raycast search and search for "Import Extension" and select the `dist` directory
