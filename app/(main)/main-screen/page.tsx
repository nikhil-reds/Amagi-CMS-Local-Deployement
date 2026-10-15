import FilePanel from '@/components/main-screen/FilePanel'
import ScreenPanel from '@/components/main-screen/ScreenPanel'

export default function MainScreen() {
  // Background: white at the top, light sea blue in the middle, dark blue at the bottom.
  return (
    <div
      className="bg-[linear-gradient(to_top,#0a0f34_0%,#000f93_22%,#6e6eff_52%,#e1e1ff_78%,#ffffff_100%)] dark:bg-[linear-gradient(to_top,#050f64_0%,#0a0f34_50%,#323243_100%)] flex flex-col gap-3 overflow-hidden p-3 sm:p-4 md:flex-row md:gap-4 lg:gap-5 lg:p-6 3xl:p-8 h-[calc(100dvh-4rem)]"
    >
      <FilePanel />
      <ScreenPanel />
    </div>
  )
}

