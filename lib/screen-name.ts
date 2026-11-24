export function defaultScreenName(number: number) {
  const names: Record<number, string> = {
    5: 'Pandora-Box',
    6: 'Outside Display 01',
    7: 'Outside Display-02',
    8: 'Transparent OLED',
    9: 'Teleprompter',
    10: 'Broadcast Big Screen',
  }

  if (names[number]) return names[number]

  if (number > 10) return `Screen ${number}`

  return `Broadcast Sim${String(number).padStart(2, '0')}`
}
