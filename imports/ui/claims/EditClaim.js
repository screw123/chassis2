import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Promise } from 'meteor/promise';
import { browserHistory } from 'react-router';

import moment from 'moment';
import accounting from 'accounting';

import { observer } from "mobx-react";
import { observable, useStrict, action } from 'mobx';
import { autorunX, observeX } from '../../api/tracker-mobx-autorun'

useStrict(true);

import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import FontIcon from 'material-ui/FontIcon';
import DatePicker from 'material-ui/DatePicker';
import AutoComplete from 'material-ui/AutoComplete';
import IconMenu from 'material-ui/IconMenu';
import MenuItem from 'material-ui/MenuItem';
import IconButton from 'material-ui/IconButton';
import Paper from 'material-ui/Paper';
import {Card, CardTitle, CardText} from 'material-ui/Card';

import { tableIconStyle, tableEvenRowStyle, comStyle } from '../theme/ThemeSelector.js';
import StatusChip from '../component/StatusChip.js';

import MoreVert from 'material-ui/svg-icons/navigation/more-vert';
import DeleteForever from 'material-ui/svg-icons/action/delete-forever';
import CloudUpload from 'material-ui/svg-icons/file/cloud-upload';

import Claims, { newClaim, updateClaim } from '../../api/DBSchema/claims.js';
import Business from '../../api/DBSchema/business.js';
import CoA from '../../api/DBSchema/COA.js';
import Project from '../../api/DBSchema/project.js';
import Status from '../../api/DBSchema/status.js';

import { checkAuth } from '../../api/auth/CheckAuth.js'

const today = moment();

class Store {
	@observable mode = 'loading';
	@observable loadDocHandler = undefined;

	@observable projectList = [];
	@observable businessList = [];
	@observable CoAList = [];
	@observable statusList = [];

	@observable header = {}
	@observable headerError= {
		project: '',
		business: '',
		claimDate: '',
		claimDesc: '',
		totalClaimAmt: '',
		doc: ''
	}
	@observable lineInput = {
		COAID: '',
		COACode: '',
		COAName:  '',
		amt: 0,
		EXCurrency: '',
		EXRate: '',
		EXAmt: '',
		Remarks: ''
	}
	@observable lineInputError = {
		COAID: '',
		COACode: '',
		amt: '',
		EXCurrency: '',
		EXRate: '',
		EXAmt: '',
		Remarks: ''
	}
	@observable line = []

	@action handleHeaderUpdate(key, value) {
		this.header[key] = value;
	}
	@action handleLineUpdate(key, value) {
		this.lineInput[key] = value;
		if (key=='EXCurrency') {
			if (value=='HKD') { this.lineInput['EXRate'] = 1 }
			else if (value=='USD') { this.lineInput['EXRate'] = 7.8 }
			else if (value=='CNY') { this.lineInput['EXRate'] = 1.15 }
			else if (value=='EUR') { this.lineInput['EXRate'] = 9 }
		}
	}

	@action handleLineAmtUpdate(key, value) {
		this.lineInput[key] = value;
		if (key == "EXAmt" ) { this.lineInput["EXAmt"] = Math.round(this.lineInput["EXAmt"] * 100)/100 }
		this.lineInput["amt"] = Math.round(this.lineInput["EXRate"] * this.lineInput["EXAmt"] *100)/100;
	}

	@action checkHeaderInput() {
		let c = false;
		if (this.header["project"] == "") {
			this.headerError["project"] = "不正確";
			c = true;
		}
		if (this.header["business"] == "") {
			this.headerError["business"] = "不正確";
			c = true;
		}
		if (this.header["claimDesc"].length < 5) {
			this.headerError["claimDesc"] = "請詳細填寫原因";
			c = true;
		}
		if (this.header["totalClaimAmt"] <= 0) {
			this.headerError["totalClaimAmt"] = "報銷總額為 0";
			c = true;
		}
		if (this.header["docFile"] == '') {
			this.headerError["doc"] = "沒有選擇檔案";
			c = true;
		}
		return c;
	}

	@action checkLineInput() {
		let c = false;
		if (this.lineInput["COAID"] == "") {
			this.lineInputError["COAID"] = "不正確";
			c = true;
		}
		if (this.lineInput["EXCurrency"] == "") {
			this.lineInputError["EXCurrency"] = "不正確";
			c = true;
		}
		if (this.lineInput["EXRate"] <= 0) {
			this.lineInputError["EXRate"] = "數值不正確, 必需是正數";
			c = true;
		}
		if (this.lineInput["EXAmt"] <= 0) {
			this.lineInputError["EXAmt"] = "數值不正確, 必需是正數";
			c = true;
		}
		return c;
	}

	@action resetLineInputError(key) { this.lineInputError[key] = '' }
	@action resetHeaderError(key) { this.headerError[key] = '' }

	@action handleAddLine() {
		this.line.push(_.clone(this.lineInput));
		this.updateTotalAmt();
		this.lineInput['EXAmt'] = 0;
		this.lineInput['COAID'] = '';
		this.lineInput['amt'] = '';
	}

	@action handleCancelRow(r) {
		this.line.splice(r,1);
		this.updateTotalAmt();
	}

	@action handleFile(e) {
		const file = e.target.files[0];
		const self = this;
		if (file.type == 'application/pdf') {
			self.handleHeaderUpdate('docFile', file);
			if (file.name.length > 10) { self.handleHeaderUpdate('doc', file.name.substring(0,9) + "...") }
			else { self.handleHeaderUpdate('doc', file.name) }
		} else if (file.type == 'image/png' || file.type == 'image/jpg' || file.type == 'image/jpeg' ) {
			Resizer.resize(e.target.files[0], {width: 1600, height: 1600, cropSquare: false}, function(err, file) {
				if (err) { self.headerError['doc'] = '檔案錯誤' }
				else {
					self.handleHeaderUpdate('docFile', file);
					if (file.name.length > 10) { self.handleHeaderUpdate('doc', file.name.substring(0,9) + "...") }
					else { self.handleHeaderUpdate('doc', file.name) }
				}
			});
		}
		else { self.headerError['doc'] = '格式不符' }
	}

	@action updateTotalAmt() {
		let i;
		let a = 0;
		for (i of this.line.slice()) { a = a + parseFloat(i["amt"]) }
		this.header["totalClaimAmt"] = Math.round(a*100)/100;
		this.resetHeaderError('totalClaimAmt');
	}

	@action changeMode(m, d) {
		console.log(m,d);
		switch(m) {
			case 'loading':
				this.mode = 'loading';
				break;
			case 'new':
				this.mode = 'new';
				this.initForm();
				break;
			case 'edit':
				this.mode = 'edit';
				this.loadDocHandler = Meteor.subscribe('claims.getClaim', d, {
					onReady: () => { this.loadForm(d) },
					onStop: (e) => { console.log(e) }
				});
				break;
			case 'view':
				this.mode = 'view';
				this.loadDocHandler = Meteor.subscribe('claims.getClaim', d, {
					onReady: () => this.loadForm(d),
					onStop: (e) => { console.log(e) }
				});
				break;
			case 'error':
				this.mode = 'error';
				break;
			default:
				this.mode = '404';
				browserHistory.push('/404');
		}
	}

	@action initForm() {
		this.header = {
			project: '',
			business: '',
			claimDate: new Date(),
			claimDesc: '',
			totalClaimAmt: 0,
			doc: '上傳單據',
			docFile: '',
			docThumbNail: null
		}
	}

	@action loadForm(d) {
		const doc = Claims.findOne({_id: d});
		if (doc == undefined) {
			this.mode = 'error';
			return;
		 }
		const fileName = doc.doc.substring(doc.doc.lastIndexOf('/')+1);
		this.header = {
			docNum: doc.docNum,
			project: doc.project,
			projectCode: doc.projectCode,
			business: doc.business,
			businessCode: doc.businessCode,
			claimDate: doc.claimDate,
			claimDesc: doc.claimDesc,
			totalClaimAmt: doc.totalClaimAmt,
			doc: (fileName.length > 10) ? (fileName.substring(0,9) + "...") : fileName,
			docFile: '',
			docThumbNail: doc.doc,
			status: doc.status
		}
		this.line = doc.content;
		this.loadDocHandler.stop();
	}


}
const store = new Store();

const sync_projectList = autorunX(() => { observeX('project.ALL.Autorun', store.projectList, Meteor.subscribe('project.ALL'), Project.find({}))});
const sync_businessList = autorunX(() => { observeX('business.ALL.Autorun', store.businessList, Meteor.subscribe('business.ALL'), Business.find({}))});
const sync_CoAList = autorunX(() => { observeX('CoA.ALL.Autorun', store.CoAList, Meteor.subscribe('CoA.ALL'), CoA.find({}))});
const sync_statusList = autorunX(() => { observeX('status.ALL.Autorun', store.statusList, Meteor.subscribe('status.ALL'), Status.find({}))});

@observer export default class NewClaim extends Component {
	constructor(props){
		super(props);
		this.verifyUser = this.verifyUser.bind(this);
		this.handleSubmit = this.handleSubmit.bind(this);
		this.rowRenderer = this.rowRenderer.bind(this);
		this.handleAddLine = this.handleAddLine.bind(this);
	}

	async verifyUser() {
		const roles = ["staff.general"];
		return new Promise(async (resolve, reject) => {
			try {
				const a = await checkAuth(roles);
				return resolve(a);
			}
			catch(err) {
				this.props.setCommonDialogMsg(err);
				this.props.setShowCommonDialog(true);
				browserHistory.push('/login');
				return resolve(false);
			}
		});
	}

	async componentWillMount() {
		store.changeMode(this.props.params.mode, this.props.params.id);
		const authResult = await this.verifyUser();
		/*refuse edit for claims  > status 500, which are done, hold or cancelled */
		if (store.mode == 'edit' && store.header.status >= 500) {
			browserHistory.goBack();
			this.props.setCommonDialogMsg('報銷狀態錯誤: 狀態為' + this.getStatusLabel(store.header.status) + '不能更改.');
			this.props.setShowCommonDialog(true);
		}
	}

	componentDidMount() {
		if (Meteor.isClient) {
			sync_projectList.start();
			sync_businessList.start();
			sync_CoAList.start();
			sync_statusList.start();
		}
	}

	componentWillUnmount() {
		if (Meteor.isClient) {
			sync_projectList.stop();
			sync_businessList.stop();
			sync_CoAList.stop();
			sync_statusList.stop();
		}
	}

	async uploadPic(url, modName) {

		return new Promise((resolve, reject) => {
			const uploader = new Slingshot.Upload("docUpload", {module: modName});

			uploader.send(url, function (error, downloadURL) {
				if (error) { return reject(uploader.xhr.response) }
				else { return resolve(downloadURL) }
			});
		});
	}

	async handleSubmit(e){
		e.preventDefault();
		this.verifyUser();

		let newDoc = {};
		if (store.checkHeaderInput()) { return }
		try {
			const docURL = await this.uploadPic(store.header.docFile, 'Claim');
			newDoc = JSON.parse(JSON.stringify(Object.assign({}, {
				'userId': Meteor.userId(),
				'userName': (Meteor.user().profile.lastName + ' ' + Meteor.user().profile.firstName),
				'project': store.header.project,
				'projectCode': Project.findOne({_id: store.header.project}).code,
				'business': store.header.business,
				'businessCode': Business.findOne({_id: store.header.business}).code,
				'claimDesc': store.header.claimDesc,
				'claimDate': store.header.claimDate,
				'totalClaimAmt': store.header.totalClaimAmt,
				'status': 100,
				'statusDesc': Status.findOne({code: 100}).desc,
				'doc': docURL,
				}, {content: store.line.toJS()}
			)));
		} catch(err) {
			this.props.setSnackBarMsg('Error: ' + err.message);
			const a = () => { }
			this.props.setSnackBarAction(a, '');
			this.props.setShowSnackBar(true);
			return;
		}
		try {
			const docNum = await newClaim.callPromise(newDoc);
			this.props.setSnackBarMsg('報銷已記錄, 編號是' + docNum + '. 請在單據上寫上報銷編號, 然後交回office.');
			const a = () => { browserHistory.push('/claims/MyClaims')};
			this.props.setSnackBarAction(a, '查看');
			this.props.setShowSnackBar(true);
		} catch (err) {
			this.props.setSnackBarMsg('Error: ' + err.message);
			const a = () => { }
			this.props.setSnackBarAction(a, '');
			this.props.setShowSnackBar(true);
			return;
		 }
	}

	handleAddLine() {
		if (store.checkLineInput()) { return }
		else {
			this.refs['AutoComplete_COA'].setState({searchText: ''});
			store.handleAddLine();
		}
	}

	getStatusLabel(s) {
		const w = store.statusList.filter( (r) => { return r.code == s })
		if ((w == undefined) || (w.length == 0)) { return "..." }
		else { return w[0].desc }
	}

	rowRenderer (row, index) {
		let rowStyle = {};
		let rowClass = "datatable_row";
		if ((index % 2) == 0) { rowStyle = tableEvenRowStyle }

		if (store.mode == 'view') { iconMenuCom = <div style={{flex: '0 1 0px', height: '24px', overflow: 'hidden'}} ></div> }
		else { iconMenuCom = ( <IconMenu
			style={{height: '24px'}}
			iconButtonElement={<IconButton style={tableIconStyle}><MoreVert /></IconButton>}
			anchorOrigin={{horizontal: 'right', vertical: 'top'}}
			targetOrigin={{horizontal: 'right', vertical: 'top'}}
							   >
			<MenuItem value={1} primaryText="移除" leftIcon={<DeleteForever />} onTouchTap={(e) => store.handleCancelRow(index)} />
		</IconMenu>)
		}

		return (
			<div className={rowClass} key={index} style={rowStyle}>
				<div style={{flex: '0 1 50px', height: '24px', overflow: 'hidden'}} > {row["COACode"]} </div>
				<div style={{flex: '0 1 100px', height: '24px',  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}} > {row["COAName"]} </div>
				<div style={{flex: '0 1 50px', height: '24px', overflow: 'hidden'}} > {row["EXCurrency"]} </div>
				<div className="table_num" style={{flex: '0 1 100px', height: '24px', overflow: 'hidden', whiteSpace: 'pre'}} > {accounting.formatColumn([row["EXAmt"],"999999"], "$", 2)[0]} </div>
				<div className="table_num" style={{flex: '0 1 100px', height: '24px', overflow: 'hidden', whiteSpace: 'pre'}} > {accounting.formatColumn([row["amt"],"999999"], "$", 2)[0]} </div>
				<div style={{flex: '0 1 200px', height: '24px', overflow: 'hidden'}} > {row["Remarks"]} </div>
				{iconMenuCom}
			</div>
		)
	}

	render() {
		let headerText = '';
		switch (store.mode) {
			case 'loading':
				headerText = '';
				break;
			case 'new':
				headerText = '新增報銷事項';
				break;
			case 'edit':
				headerText = '修改報銷事項 #' + store.header.docNum;
				break;
			case 'view':
				headerText = '查看報銷事項 #' + store.header.docNum;
				break;
			default :
				headerText = 'ERROR';
				this.props.setCommonDialogMsg('錯誤: 你沒有權限存取此檔案');
				this.props.setShowCommonDialog(true);
				browserHistory.push('/dashboard');
		}
		return (
			<div>
				<div className="row-left">
					<h1 className="widget widget-3col2">{headerText}</h1>
					<div className="widget widget-3col default-iconGrp">
						<StatusChip style={{display: (store.mode=='new') ? 'none' : 'flex'}} status={store.header.status} labelWord={ this.getStatusLabel(store.header.status)}/>
					</div>
					<div className="widget widget-1col">
						<h3><span className="fa fa-info-circle"> </span> 基本資料</h3>
						<div className="default-textField">
							<AutoComplete className="default-textField" floatingLabelText="項目" name="project" filter={AutoComplete.fuzzyFilter} openOnFocus={true} maxSearchResults={5} disabled={store.mode=='view'}
								style={comStyle}
								menuStyle={comStyle}
								listStyle={comStyle}
								value={store.header.project}
								searchText={store.header.projectCode}
								dataSource={store.projectList.toJS()}
								dataSourceConfig={{text: 'code', value: '_id'}}
								onNewRequest={v => {
									store.resetHeaderError('project');
									store.handleHeaderUpdate('project', v._id);
								}}
								errorText={store.headerError.project}
							/>
						</div>
						<div className="default-textField">
							<AutoComplete className="default-textField" floatingLabelText="業務" name="business" filter={AutoComplete.fuzzyFilter} openOnFocus={true} maxSearchResults={5} disabled={store.mode=='view'}
								style={comStyle}
								menuStyle={comStyle}
								listStyle={comStyle}
								value={store.header.business}
								searchText={store.header.businessCode}
								dataSource={store.businessList.toJS()}
								dataSourceConfig={{text: 'code', value: '_id'}}
								onNewRequest={v => {
									store.resetHeaderError('business');
									store.handleHeaderUpdate('business', v._id);
								}}
								errorText={store.headerError.business}
							/>
						</div>
						<div className="default-textField">
							<DatePicker className="default-textField" floatingLabelText="報銷單據日期" name="claimDate" autoOk={true} disabled={store.mode=='view'}
								minDate={moment().subtract(3, 'months').toDate()}
								maxDate={moment().toDate()}
								value={store.header.claimDate}
								onChange={(a, e) => store.handleHeaderUpdate("claimDate", e)}
								errorText={store.headerError.claimDate}
								textFieldStyle={{width: 180}}
							/>
						</div>
						<TextField className="default-textField" name="claimDesc" hintText="" value={store.header.claimDesc} floatingLabelText="報銷原因" disabled={store.mode=='view'}
							onChange={e => {
								store.resetHeaderError('claimDesc');
								store.handleHeaderUpdate(e.target.name, e.target.value);
							}}
							errorText={store.headerError.claimDesc} multiLine={true}/>

						<TextField className="default-textField" name="claimAmt" hintText="" value={accounting.formatMoney(store.header.totalClaimAmt)} floatingLabelText="報銷總額(HKD)" disabled={true} errorText={store.headerError.totalClaimAmt}/>

						<RaisedButton
							disabled={store.mode=='view'}
							containerElement='label'
							name="doc"
							label={ (store.headerError.doc == '')? (store.header.doc): (store.headerError.doc) }
							labelColor={'#ff0000'}
							primary={(store.headerError.doc == '')}
							style={comStyle}
							icon={<CloudUpload />}
							onChange={ (e) => {
								store.resetHeaderError('doc');
								store.handleFile(e);
							}}
						>
							<input type="file" className="inputfile" />
						</RaisedButton>
					</div>

				</div>

				<div className="row-left">
					<div className="widget widget-1col" style={{display: (store.mode=='view') ? 'none' : 'flex'}} >
						<h3><span className="fa fa-th-list"> </span> 詳細資料</h3>
						<div className="default-textField">
							<AutoComplete className="default-textField" floatingLabelText="費用分類" name="COA" filter={AutoComplete.fuzzyFilter} openOnFocus={true} maxSearchResults={5}
								style={comStyle}
								menuStyle={comStyle}
								listStyle={comStyle}
								ref={"AutoComplete_COA"}
								value={store.lineInput.COAID}
								searchText={store.COAIDSearch}
								dataSource={store.CoAList.toJS()}
								dataSourceConfig={{text: 'desc', value: '_id'}}
								onUpdateInput={this.handleUpdateInput}
								onNewRequest={v => {
									store.resetLineInputError('COAID');
									store.handleLineUpdate('COAID', v._id);
									store.handleLineUpdate('COACode', v.code);
									store.handleLineUpdate('COAName', v.desc);
								}}
								errorText={store.lineInputError.COAID}
							/>
						</div>
						<div className="default-textField">
							<AutoComplete className="default-textField" floatingLabelText="貨幣" name="EXCurrency" filter={AutoComplete.fuzzyFilter} openOnFocus={true} maxSearchResults={5}
								style={comStyle}
								menuStyle={comStyle}
								listStyle={comStyle}
								value={store.header.project}
								dataSource={["HKD", "CNY", "USD", "EUR"]}
								errorText={store.lineInputError.EXCurrency}
								onNewRequest={v => {
									store.resetLineInputError('EXCurrency');
									store.handleLineUpdate('EXCurrency', v)
								}}
							/>
						</div>
						<TextField className="default-textField" name="EXRate" value={store.lineInput.EXRate} floatingLabelText="滙率" errorText={store.lineInputError.EXRate} type="number" onChange={e => {
							store.handleLineAmtUpdate(e.target.name, Math.round(e.target.value*10000)/10000 );
							store.resetLineInputError('EXRate');
						}} />
						<TextField className="default-textField" name="EXAmt" value={store.lineInput.EXAmt} floatingLabelText="金額" errorText={store.lineInputError.EXAmt} type="number" onChange={e => {
							store.handleLineAmtUpdate(e.target.name, Math.round(e.target.value*100)/100);
							store.resetLineInputError('EXAmt');
						}} />
						<TextField className="default-textField" name="amt" value={accounting.formatMoney(store.lineInput.amt) } floatingLabelText="港元金額" disabled={true} />
						<TextField className="default-textField" name="Remarks" hintText="" value={store.lineInput.Remarks} floatingLabelText="條目備注" onChange={e => store.handleLineUpdate(e.target.name, e.target.value)} errorText={store.lineInputError.Remarks} multiLine={true}/>
					</div>
					<div className="widget widget-1col" style={{display: (store.mode=='view') ? 'none' : 'flex'}}>
						<RaisedButton label="新增" primary={true} icon={<FontIcon className="fa fa-plus" />} onTouchTap={() => this.handleAddLine()} />
					</div>
					<div className="widget table-container">
						<Card style={{ flex: '1 1 auto' }}>
							<CardTitle title="報銷明細" />
							<CardText>
								<div className="datatable_headerRow">
									<div style={{flex: '0 1 50px', height: '24px', overflow: 'hidden'}} >分類</div>
									<div style={{flex: '0 1 100px', height: '24px', overflow: 'hidden'}} ></div>
									<div style={{flex: '0 1 50px', height: '24px', overflow: 'hidden'}} >貨幣</div>
									<div style={{flex: '0 1 100px', height: '24px', overflow: 'hidden', textAlign: 'center'}} >外幣</div>
									<div style={{flex: '0 1 100px', height: '24px', overflow: 'hidden', textAlign: 'center'}} >港元</div>
									<div style={{flex: '0 1 200px', height: '24px', overflow: 'hidden'}} >備注</div>
								</div>
								{store.line.map(this.rowRenderer)}
							</CardText>
						</Card>
					</div>
					<div className="widget widget-1col" style={{display: (store.mode=='view') ? 'none' : 'flex'}}>
						<RaisedButton label="Submit" fullWidth={true} secondary={true} icon={<FontIcon className="fa fa-plus" />} onTouchTap={(e) => this.handleSubmit(e)} />
					</div>
				</div>
			</div>
		)
	}
}
