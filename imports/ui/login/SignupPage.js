import React, { Component } from 'react';
import { browserHistory, Link } from 'react-router';
import { Accounts } from 'meteor/accounts-base';
import { observer } from "mobx-react";
import { observable, useStrict, action } from 'mobx';

import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import FontIcon from 'material-ui/FontIcon';
import Dialog from 'material-ui/Dialog';

import { buttonStyle, iconButtonStyle } from '../theme/ThemeSelector.js';

useStrict(true);

class Store {
	@observable value = {
		email: '',
		password: '',
		firstName: '',
		lastName: '',
		slackUserName: ''
	}
	@observable error= {
		email: '',
		password: '',
		firstName: '',
		lastName: '',
		slackUserName: ''
	}

	@observable errDialogOpen = false;
	@observable errDialogContent = '';

	@action handleValueUpdate(key, value) {this.value[key] = value}
	@action checkField(key) {
		errmsg = '';
		switch (key) {
			case 'email':
				if (!this.value[key].includes("@"))  { errmsg = 'Email 地址格式不正確'; }
				break;
			case 'password':
				if (!(this.value[key].length >= 6))  { errmsg = '密碼需6位以上'; }
				break;
			case 'firstName':
				if (!(this.value[key].length >= 2))  { errmsg = '不能為空'; }
				break;
			case 'lastName':
				if (!(this.value[key].length >= 2))  { errmsg = '不能為空'; }
				break;
			case 'slackUserName':
				if (!this.value[key].includes("@"))  { errmsg = 'Slack 用戶名稱格式不正確'; }
				break;
		}
		this.error[key] = errmsg;
	}

	@action toggleErrDialog() {this.errDialogOpen = !this.errDialogOpen}
	@action setErrDialogMsg(msg) { this.errDialogContent = msg }
}
const store = new Store();

@observer export default class SignupPage extends Component {
	constructor(props){
		super(props);
		this.handleSubmit = this.handleSubmit.bind(this);
	}

	componentWillMount() { if (Meteor.userId() != null) { browserHistory.replace('/') }}

	handleSubmit(e){
		e.preventDefault();
		formIsGood = true;
		for (const key in store.value) { store.checkField(key) }
		for (const key in store.error) {
			if (store.error[key].length > 0) { formIsGood = false }
		}
		if (formIsGood) {
			Accounts.createUser(
				{
					email: store.value.email,
					password: store.value.password,
					profile: {
						firstName: store.value.firstName,
						lastName: store.value.lastName,
						slackUserName: store.value.slackUserName
					}
				}, function (error) {
					if (error) {
						store.setErrDialogMsg(error.error + ": " + error.reason);
						store.toggleErrDialog();
					} else { browserHistory.push('/login') }
				}
			)
		}
	}

	render() {
		return (
			<div className="row-center">
				<div className="widget widget-default">
					<h1>建立新帳號</h1>
					<TextField name="email" value={store.value.email} hintText="" floatingLabelText="Email" onChange={e => store.handleValueUpdate(e.target.name, e.target.value)} errorText={store.error.email} onBlur={e => store.checkField(e.target.name)} />
					<TextField name="password" value={store.value.password} hintText="" floatingLabelText="密碼" type="password" onChange={e => store.handleValueUpdate(e.target.name, e.target.value)} errorText={store.error.password} onBlur={e => store.checkField(e.target.name)}/>
					<TextField name="firstName" hintText="" value={store.value.firstName} floatingLabelText="姓" onChange={e => store.handleValueUpdate(e.target.name, e.target.value)} errorText={store.error.firstName} onBlur={e => store.checkField(e.target.name)}/>
					<TextField name="lastName" hintText="" value={store.value.lastName} floatingLabelText="名" onChange={e => store.handleValueUpdate(e.target.name, e.target.value)} errorText={store.error.lastName} onBlur={e => store.checkField(e.target.name)}/>
					<div>
						<TextField name="slackUserName" value={store.value.slackUserName} hintText="請加上@, 如 @mary154, @ming" floatingLabelText="Slack 用戶名稱" onChange={e => store.handleValueUpdate(e.target.name, e.target.value)} errorText={store.error.slackUserName} onBlur={e => store.checkField(e.target.name)}/>
						<RaisedButton className="button" secondary={true} style={iconButtonStyle} icon={<FontIcon className="fa fa-sign-in" />} onTouchTap={(e) => this.handleSubmit(e)} />
					</div>
					<Dialog
						actions={<RaisedButton className="form-item" label="OK" primary={true} onTouchTap={() => store.toggleErrDialog()} />}
						modal={false}
						open={store.errDialogOpen}
						onRequestClose={() => store.toggleErrDialog()}
					>
						{store.errDialogContent}
					</Dialog>
				</div>
			</div>
    	);
  	}
};
