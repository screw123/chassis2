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
	@observable loggingIn = false;

	@action toggleLoggingIn(b) {
		if (b===undefined) { this.loggingIn = !this.loggingIn }
		else { this.loggingIn = b}
	}

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
		if (Meteor.user()==null) { }
		else {
			if (!Meteor.user().isActive) {  }
			else if (Meteor.userId() != null) { browserHistory.replace('/') }
		}

	}

	handleSubmit(e) {
		e.preventDefault();
		store.toggleLoggingIn(true);

		Meteor.loginWithPassword(store.user.email, store.user.password, function (error) {
			if (error) {
				store.handleLoginError(error.error + ' ' + error.reason);
				store.toggleShowLoginErr();
				store.toggleLoggingIn(false);
			} else {
				browserHistory.push('/');
				store.toggleLoggingIn(false);
			}
		});
	}

  	render() {
	    return (
			<div className="row-center">
				<div className="widget widget-default">
					<h1>登入</h1>
						<TextField disabled={store.loggingIn} hintText="請輸入Email" name="email" floatingLabelText="Email" value={store.user.email} onChange={e => store.handleUserUpdate(e.target.name, e.target.value)}/>
						<div>

						<TextField disabled={store.loggingIn} hintText="請輸入密碼" name="password" floatingLabelText="密碼" type="password" value={store.user.password}
							onChange={e => store.handleUserUpdate(e.target.name, e.target.value)}
							onKeyPress={(e) => {
								if (e.key === 'Enter') {
									this.handleSubmit(e)
								}
							}}
						/>

						<RaisedButton disabled={store.loggingIn} className="button" secondary={true} style={iconButtonStyle} icon={<FontIcon className="fa fa-sign-in" />} onTouchTap={(e) => this.handleSubmit(e)} />
					</div>
					<div>
						<RaisedButton disabled={store.loggingIn} label="忘記密碼" primary={true} style={buttonStyle} containerElement={<Link to="/signup"/>} />
						<RaisedButton disabled={store.loggingIn} label="新帳號" primary={true} style={buttonStyle} containerElement={<Link to="/signup"/>} />
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
