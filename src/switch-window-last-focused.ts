import switchWindow from "./switch-window";

export default async function() {
  await switchWindow({ arguments: { direction: "last", mode: "focused" } });
}
