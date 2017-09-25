import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import ReactDOM from 'react-dom';
import { browserHistory, Link } from 'react-router';
import { observer } from "mobx-react";
import mobx, { observable, useStrict, action } from 'mobx';
import { autorunX, observeX } from '../../api/tracker-mobx-autorun.js'

import { checkAuth } from '../../api/auth/CheckAuth.js';

import { getUserOrg } from '../../api/DBSchema/user.js';

import DocList1 from '../component/DocList1.js';
import DocLoad1 from '../component/DocLoad1.js';
import { tableHandles, tableList } from '../../api/DBSchema/DBTOC.js';

class Store {
	allowedModes = [undefined, 'new', 'view', 'edit'];
	@observable mode = ''; //control listing or show single doc details or etc
	@observable docMode = ''; //control new/edit/view/etc in doc mode
	@observable table = '';
	@observable docId = '';
	@observable includeFields = [];
	@observable lookupList = {};

	@action updatelookupList(b) { this.lookupList = {organization: b} }

	@action setMode(docMode, table, id) {
		switch(docMode) {
			case undefined:
				this.mode = 'docList';
				this.table = table;
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
let tableHandle;

@observer export default class ClaimTest extends Component {
	constructor(props) {
		super(props);
		tableHandle = tableHandles(this.props.params.table)
	}

	async verifyUser() {
		const roles = [{role: 'admin', group: 'SYSTEM'}];
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
			let b = await getUserOrg.callPromise(Meteor.userId()); //fixme to load full org list instead of just user org list
			store.updatelookupList(b);
			console.log('comMount', this.props.params.docMode, this.props.params.table, this.props.params.id)
			store.setMode(this.props.params.docMode, this.props.params.table, this.props.params.id);
		}
		else {
			this.props.setCommonDialogMsg('錯誤: 不支援模式',this.props.params.docMode);
			this.props.setShowCommonDialog(true);
			browserHistory.push('/dashboard');
		}
	}

	async componentWillReceiveProps(nextProps) {
		tableHandle = tableHandles(nextProps.params.table)
		if (store.allowedModes.includes(nextProps.params.docMode)) {
			let a = await this.verifyUser();
			console.log('nextComMount', nextProps.params.docMode, nextProps.params.table, nextProps.params.id)
			store.setMode(nextProps.params.docMode, nextProps.params.table, nextProps.params.id);
		}
		else {
			this.props.setCommonDialogMsg('錯誤: 不支援模式',nextProps.params.docMode);
			this.props.setShowCommonDialog(true);
			browserHistory.push('/dashboard');
		}
	}

	render() {
		console.log(store.table)
		return (
			<div>
				{(store.mode=='docList') &&
					<DocList1
						cardTitle={'數據庫列表 - ' + store.table}
						table={store.table}
						query={store.table+'.ALL'}
						rolesAllowed={[{role: 'admin', group: 'SYSTEM'}]}
						initLimit={10}
						allowMultiSelect={false}
						allowDownload={true}
						allowDownloadAll={false}
						allowNewDoc={true}
						docLoadPath='/admin/TableLoad/'
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
						rolesAllowed={[{role: 'admin', group: 'SYSTEM'}]}
						providedLookupList={store.lookupList}
						customFields={{}}
						docListPath={'/admin/TableLoad/'+store.table+'/'}
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
