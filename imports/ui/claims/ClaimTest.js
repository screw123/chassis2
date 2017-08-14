import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import ReactDOM from 'react-dom';
import { browserHistory, Link } from 'react-router';
import { observer } from "mobx-react";
import mobx, { observable, useStrict, action } from 'mobx';
import { autorunX, observeX } from '../../api/tracker-mobx-autorun.js'

import FileSaver from 'file-saver';

import { checkAuth } from '../../api/auth/CheckAuth.js';

import DocList1 from '../component/DocList1.js';
import DocLoad1 from '../component/DocLoad1.js';

class Store {
	allowedModes = [undefined, 'new', 'view', 'edit'];
	table = 'claims';
	@observable mode = ''; //control listing or show single doc details or etc
	@observable docMode = ''; //control new/edit/view/etc in doc mode
	@observable table = '';
	@observable docId = '';

	@action setMode(docMode, table, id) {
		switch(docMode) {
			case undefined:
				this.mode = 'docList';
				break;
			case 'new':
			case 'edit':
			case 'view':
				this.mode = 'docLoad';
				this.docMode = docMode;
				this.docId = id;
				this.table = table;
				break;
			default:
				this.mode = 'error';
		}
	}
}
const store = new Store();

@observer export default class ClaimTest extends Component {
	constructor(props) {
		super(props);
	}

	async verifyUser() {
		const roles = [];
		try { const a = await checkAuth(roles) }
		catch(err) {
			this.props.setCommonDialogMsg(err);
			this.props.setShowCommonDialog(true);
			browserHistory.push('/login');
			return;
		}
	}

	async componentWillMount() {
		if (store.allowedModes.includes(this.props.params.docMode)) {
			let a = await this.verifyUser();
			store.setMode(this.props.params.docMode, this.props.params.table, this.props.params.id);
		}
		else {
			this.props.setCommonDialogMsg('錯誤: 不支援模式',this.props.params.docMode);
			this.props.setShowCommonDialog(true);
			browserHistory.push('/dashboard');
		}
	}

	async componentWillReceiveProps(nextProps) {
		if (store.allowedModes.includes(nextProps.params.docMode)) {
			let a = await this.verifyUser();
			store.setMode(nextProps.params.docMode, nextProps.params.table, nextProps.params.id);
		}
		else {
			this.props.setCommonDialogMsg('錯誤: 不支援模式',nextProps.params.docMode);
			this.props.setShowCommonDialog(true);
			browserHistory.push('/dashboard');
		}
	}

	render() {
		return (
			<div>
				{(store.mode=='docList') &&
					<DocList1
						cardTitle='所有報銷'
						table='claims'
						query='claims.ALL'
						rolesAllowed={['system.admin']}
						includeFields={['docNum', 'userId', 'createAt']}
						initLimit={10}
						allowMultiSelect={false}
						allowDownload={true}
						allowDownloadAll={false}
						allowNewDoc={true}
						docLoadPath={'/claims/ClaimTest/'}
						setShowCommonDialog={this.props.setShowCommonDialog}
						setCommonDialogMsg={this.props.setCommonDialogMsg}
						setShowSnackBar={this.props.setShowSnackBar}
						setSnackBarMsg={this.props.setSnackBarMsg}
						setSnackBarAction={this.props.setSnackBarAction}
					/>
				}
				{(store.mode=='docLoad') &&
					<DocLoad1

						table={store.table}
						mode={store.docMode}
						docId={store.docId}
						rolesAllowed={['system.admin']}
						includeFields={['docNum', 'userId', 'userName', 'user', 'createAt', 'content.$.amt', 'content.$.COAId', 'content.$.COADesc', 'content.$.COA']}
						docListPath={'/claims/ClaimTest/'}

						setShowCommonDialog={this.props.setShowCommonDialog}
						setCommonDialogMsg={this.props.setCommonDialogMsg}
						setShowSnackBar={this.props.setShowSnackBar}
						setSnackBarMsg={this.props.setSnackBarMsg}
						setSnackBarAction={this.props.setSnackBarAction}
					/>
				}
				{(store.mode=='error') && <div>模式錯誤, 模式 {this.props.params.docMode} 不存在</div>}
				{((store.mode!='docList')&&(store.mode!='docLoad')&&(store.mode!='error')) && <div>載入中...</div>}
			</div>

		)
	}
}
//fixme to connect docLoadPath to claims/DocList to finish the testing part
