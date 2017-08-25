import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import ReactDOM from 'react-dom';
import { browserHistory, Link } from 'react-router';

import { observer } from "mobx-react";
import { observable, useStrict, action } from 'mobx';

useStrict(true);

import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';

import { comStyle, buttonStyle, iconButtonStyle } from '../theme/ThemeSelector.js';
import { resetPassword } from '../../api/DBSchema/user.js';
import { checkAuth } from '../../api/auth/CheckAuth.js';

class Store {
	@observable oldPW = '';
	@observable newPW = '';
	@observable newPWVerify = '';
	@observable oldPWErr = '';
	@observable newPWErr = '';
	@observable pwRegEx = new RegExp("^(?=.*[a-z])((?=.*[A-Z])|(?=.*[0-9]))")
	@observable submitting = false;

	@action toggleSubmitting(b) {
		if (b===undefined) { this.submitting = !this.submitting }
		else { this.submitting = b}
	}

	@action setOldPW(a) {this.oldPW = a}
	@action setnewPWVerify(a) {
		this.newPWVerify = a;
		this.checknewPWErr();
	}
	@action setnewPW(a) {
		this.newPW = a
		this.checknewPWErr();
	}

	@action checknewPWErr() {
		this.newPWErr = ''
		if (this.newPW.length < 8) { this.newPWErr = '密碼長度必需8位或以上' }
		if (!this.pwRegEx.test(this.newPW)) { this.newPWErr = '密碼需同時有大小階英文字母及數字'}
		if (this.newPW != this.newPWVerify) {this.newPWErr = '新密碼2次輸入不相等'}
	}
	@action checkoldPW() {
		if (this.oldPW.length < 1) { this.oldPWErr = '請填寫舊密碼' }
	}
}
const store = new Store();

@observer export default class ResetPassword extends Component {
	constructor(props){ super(props) }

	async verifyUser(roles) {
		return new Promise(async (resolve, reject) => {
			try {
				const a = await checkAuth(roles)
				return resolve(true);
			}
			catch(err) { //On user issue, use master common dialog to display
				this.props.setCommonDialogMsg(err);
				this.props.setShowCommonDialog(true);
				browserHistory.push('/login');
				return reject(err);
			}
		});
	}

	async componentWillMount() { const a = await this.verifyUser([]) }
	async componentWillReceiveProps(nextProps) { const a = await this.verifyUser([]) }

	async handleSubmit(e) {
		e.preventDefault();
		if ((store.oldPWErr.length > 0)||(store.newPWErr.length > 0)) {
			this.props.setCommonDialogMsg('請先處理表格內的問題!');
			this.props.setShowCommonDialog(true);
		}
		else {
			store.toggleSubmitting(true);
			try {
				const a = await this.verifyUser([]);
				resetPassword.callPromise({id: Meteor.userId(), password: store.newPW});
			} catch(err) {
				this.props.setCommonDialogMsg(err.message);
				this.props.setShowCommonDialog(true);
				store.submitting(false);
			}
			this.props.setSnackBarMsg('密碼已重設');
			this.props.setSnackBarAction({}, '');
			this.props.setShowSnackBar(true);
			store.toggleSubmitting(false);
			browserHistory.push('/login');
		}

	}

	render() {
		return (
			<div className="row-center">
				<div className="widget widget-default">
					<h1>重設密碼</h1>
					<TextField disabled={store.submitting} hintText="請輸入舊密碼" name="oldPW" type="password" floatingLabelText="舊密碼" value={store.oldPW} onChange={e => store.setOldPW(e.target.value)} errorText={store.oldPWErr} />

					<TextField disabled={store.submitting} hintText="請輸入新密碼" name="newPW" type="password" floatingLabelText="新密碼" value={store.newPW} onChange={e => store.setnewPW(e.target.value)} errorText={store.newPWErr} />

					<TextField disabled={store.submitting} hintText="請再次輸入新密碼" name="newPWVerify" type="password" floatingLabelText="再次輸入新密碼" value={store.newPWVerify} onChange={e => store.setnewPWVerify(e.target.value)} />

					<RaisedButton disabled={store.submitting} label="確認" primary={true} style={buttonStyle}  onTouchTap={(e) => this.handleSubmit(e)} />


				</div>
			</div>
		)
	}

}
