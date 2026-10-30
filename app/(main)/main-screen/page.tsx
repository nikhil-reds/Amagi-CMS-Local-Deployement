import FilePanel from '@/components/main-screen/FilePanel'
import ScreenPanel from '@/components/main-screen/ScreenPanel'
import './main-screen.css'

export default function MainScreen() {
  return (
    <div className="main-screen-page" data-main-screen-ui>
      <header className="main-screen-heading">
        <h1>Main Screen</h1>
        <p>Build what each screen plays. Add files from your library or drag them onto a screen.</p>
      </header>
      <div className="main-screen-workspace">
        <FilePanel />
        <ScreenPanel />
      </div>
    </div>
  )
}
