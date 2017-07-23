import React, {Component} from 'react'
import { Router, Route, browserHistory, IndexRoute } from 'react-router'

import { observer } from "mobx-react";
import { observable, useStrict, action } from 'mobx';
useStrict(true);

// pages
import SignupPage from '../ui/login/SignupPage.js'
import LoginPage from '../ui/login/LoginPage.js'
import Dashboard from '../ui/dashboard/Dashboard.js'
import EditClaim from '../ui/claims/EditClaim.js'
import ClaimList from '../ui/claims/ClaimList.js'
import AdminPortal from '../ui/admin/Admin.js'
import AdminTableList from '../ui/admin/TableList.js'
import AdminDocList from '../ui/admin/DocList.js'
import AdminDocLoad from '../ui/admin/DocLoad.js'

import App from '../ui/App.js'

import Test from '../ui/test/test.js'

export const renderRoutes = () => (
    <Router history={browserHistory}>
        <Route path="/" component={App}>
            <IndexRoute component={Dashboard}/>
            <Route path="login" component={LoginPage}/>
            <Route path="signup" component={SignupPage}/>
            <Route path="dashboard" component={Dashboard}/>
            <Route path="claims">
                <IndexRoute component={ClaimList}/>
				<Route path="list(/:mode)" component={ClaimList}/>
                <Route path="item/:mode(/:id)" component={EditClaim}/>
            </Route>
            <Route path="admin">
                <IndexRoute component={AdminTableList}/>
                <Route path="TableList" component={AdminTableList} />
                <Route path="DocList/:tableName" component={AdminDocList} />
                <Route path="DocLoad/:tableName/:mode(/:id)" component={AdminDocLoad} />
            </Route>
            <Route path="testaaa" component={Test}/>
            <Route path="*" component={notFound} />
        </Route>

    </Router>
);

class NotFoundStore {
	@observable c = 3;
	@action setC(n) { this.c = n }
	@action tick = () => {
		if (this.c>0) { this.c -= 1 };
		if (this.c == 0) { browserHistory.replace('/login') }
	}
}
const notFoundStore = new NotFoundStore();

@observer class notFound extends Component {
	componentDidMount() {
		notFoundStore.setC(3);
		this.handle = setInterval(notFoundStore.tick, 1000);
	 }
  	componentWillUnmount() { clearInterval(this.handle) }
	render() {
		return (<div>頁面不存在, {notFoundStore.c} 秒後接到登入頁面...</div>)
	}
}
