import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import ReactDOM from 'react-dom';
import { browserHistory, Link } from 'react-router';

import { observer } from "mobx-react";
import { observable, useStrict, action } from 'mobx';

useStrict(true);

import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import FontIcon from 'material-ui/FontIcon';
import IconButton from 'material-ui/IconButton';
import Dialog from 'material-ui/Dialog';

import { comStyle, buttonStyle, iconButtonStyle } from '../theme/ThemeSelector.js';

class Store {
	@observable user = {
		email: '',
		password: ''
	}

	@observable loginErr = '';
	@observable showLoginErr = false;

	@action handleUserUpdate (key, value) {
		this.user[key] = value;
	}

	@action toggleShowLoginErr () {
		this.showLoginErr = !this.showLoginErr;
	}

	@action handleLoginError(msg) {
		this.loginErr = msg;
	}
}

const store = new Store();

@observer export default class LoginPage extends Component {
	constructor(props){
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	componentWillMount() {
		if (Meteor.userId() != null) { browserHistory.replace('/') }
	}

	handleSubmit(e) {
		e.preventDefault();
		Meteor.loginWithPassword(store.user.email, store.user.password, function (error) {
			if (error) {
				store.handleLoginError(error.error + ' ' + error.reason);
				store.toggleShowLoginErr();
			} else {
				browserHistory.push('/');
			}
		});
	}

  	render() {
	    return (
			<div className="row-center">
				<div className="widget widget-default">
					<h1>登入</h1>
					<TextField hintText="請輸入Email" name="email" floatingLabelText="Email" value={store.user.email} onChange={e => store.handleUserUpdate(e.target.name, e.target.value)}/>
					<div>
						<TextField hintText="請輸入密碼" name="password" floatingLabelText="密碼" type="password" value={store.user.password} onChange={e => store.handleUserUpdate(e.target.name, e.target.value)}/>
						<RaisedButton className="button" secondary={true} style={iconButtonStyle} icon={<FontIcon className="fa fa-sign-in" />} onTouchTap={(e) => this.handleSubmit(e)} />
					</div>
					<div>
						<RaisedButton label="忘記密碼" primary={true} style={buttonStyle} containerElement={<Link to="/signup"/>} />
						<RaisedButton label="新帳號" primary={true} style={buttonStyle} containerElement={<Link to="/signup"/>} />
					</div>
					<Dialog
						actions={<RaisedButton className="button" label="OK" onTouchTap={() => store.toggleShowLoginErr()} />}
						modal={false}
						open={store.showLoginErr}
						onRequestClose={() => store.toggleShowLoginErr()}
					>
						{store.loginErr}
					</Dialog>
				</div>
			</div>
		);
	}
}
