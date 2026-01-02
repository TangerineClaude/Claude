import { Route, Switch } from 'wouter';
import Layout from './components/Layout';
import Home from './pages/Home';
import Missions from './pages/Missions';
import MissionDetail from './pages/MissionDetail';
import Agents from './pages/Agents';
import Browser from './pages/Browser';

function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/tasks" component={Missions} />
        <Route path="/missions/:id" component={MissionDetail} />
        <Route path="/agents" component={Agents} />
        <Route path="/browser" component={Browser} />
        <Route>404 - Not Found</Route>
      </Switch>
    </Layout>
  );
}

export default App;
