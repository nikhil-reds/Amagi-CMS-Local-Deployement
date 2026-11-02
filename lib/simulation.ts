import { DEFAULT_CONTROLS } from './media-controls'

export function simulationNumbers(targetIndex: number) {
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex > 3) throw new Error('Invalid simulation target')
  return [1, 2, 3].map(number => targetIndex * 3 + number)
}

export function simulationAssets(targetIndex: number, feeds: { screenNumber: number; url: string }[]) {
  return simulationNumbers(targetIndex).map(number => {
    const feed = feeds.find(item => item.screenNumber === number)
    if (!feed) throw new Error(`Simulation screen ${number} is missing`)
    return {
      id: `simulation-${number}`, kind: 'website' as const,
      controls: { ...DEFAULT_CONTROLS },
      document: { id: `simulation-${number}`, name: `Simulation screen ${number}`, mimeType: 'text/html', sourceType: 'WEBSITE', websiteUrl: feed.url, s3Url: feed.url },
    }
  })
}
