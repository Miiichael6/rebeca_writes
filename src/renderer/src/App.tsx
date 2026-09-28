import BottomBar from './components/BottomBar'
import Player from './components/Player'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import TranscriptView from './components/TranscriptView'

function App(): React.JSX.Element {
  return (
    <div className="app">
      <Sidebar selectedId="1" />
      <main className="main">
        <Toolbar />
        <Player />
        <TranscriptView segments={[]} />
        <BottomBar />
      </main>
    </div>
  )
}

export default App
