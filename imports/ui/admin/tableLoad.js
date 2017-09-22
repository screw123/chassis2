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
import DocLoad1_store from '../component/DocLoad1_store.js'
import { tableHandles } from '../../api/DBSchema/DBTOC.js';
import { updateVal } from '../component/DocLoadHelper.js';

import { getUserOrg } from '../../api/DBSchema/user.js';

import TextField from 'material-ui/TextField';

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
			let b = await getUserOrg.callPromise(Meteor.userId());
			store.updatelookupList(b);
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
			store.setMode(nextProps.params.docMode, nextProps.params.table, nextProps.params.id);
		}
		else {
			this.props.setCommonDialogMsg('錯誤: 不支援模式',nextProps.params.docMode);
			this.props.setShowCommonDialog(true);
			browserHistory.push('/dashboard');
		}
	}

	getCustomComponent() {
		return ({
			'amat':
				<TextField key='amt' className="default-textField" name='amt' type="number" hintText="請輸入金額" value={docLoadStore.fieldsValue['EXAmt']* docLoadStore.fieldsValue['EXRate'] } floatingLabelText={tableHandle.schema['amt'].label} disabled={true} />
		})
	}

	render() {
		return (
			<div>
				{(store.mode=='docList') &&
					<DocList1
						cardTitle='所有報銷'
						table='acctJournal'
						query='acct_journal.ALL'
						rolesAllowed={[{role: 'admin', group: 'SYSTEM'}]}
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
						rolesAllowed={[{role: 'admin', group: 'SYSTEM'}]}
						customFields={this.getCustomComponent()}
						providedLookupList={store.lookupList}
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
