import React from 'react';
import { BrowserRouter as Router, Route , Link} from 'react-router-dom';

const Home = () => <div> <Link to='/login'> login</Link> <Link to='/register'> Register</Link> </div>
const Login = () => <h1> Login </h1>
const Register = () => <h1> Register </h1>

const App = () => {
  return (
    <Router>
      <Route path='/' exact component={Home} />
      <Route path='/login' exact component={Login} />
      <Route path='/register' exact component={Register} />
    </Router>
  );
}

export default App;
