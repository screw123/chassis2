//Basic React/Meteor/mobx import
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { browserHistory, Link } from 'react-router';
import { observer } from "mobx-react";
import mobx, { observable, useStrict, action } from 'mobx';
import { autorunX, observeX } from '../../api/tracker-mobx-autorun'
useStrict(true);
//Material-ui import
import AutoComplete from 'material-ui/AutoComplete';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import FontIcon from 'material-ui/FontIcon';
import IconButton from 'material-ui/IconButton';
import IconMenu from 'material-ui/IconMenu';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
import Paper from 'material-ui/Paper';
import Dialog from 'material-ui/Dialog';
import Checkbox from 'material-ui/Checkbox';
import {Card, CardHeader, CardTitle, CardText, CardActions} from 'material-ui/Card';
import Chip from 'material-ui/Chip';
import Avatar from 'material-ui/Avatar';
import {List as ListM, ListItem} from 'material-ui/List';
//Package ad-hoc function import
import FileSaver from 'file-saver';
import 'react-virtualized/styles.css'
import { InfiniteLoader, List } from 'react-virtualized'
import Measure from 'react-measure';
import moment from 'moment';
import accounting from 'accounting';
//Custom formatting/component import
import { tableStyle, fieldStyle, comStyle, buttonStyle} from '../theme/ThemeSelector.js';
import StatusChip from '../component/StatusChip.js';
import UserChip from '../component/UserChip.js';
import TableFilterSortChip  from '../component/TableFilterSortChip.js';
import FilterDialog from '../component/FilterDialog.js';
//Custom function import
import { checkAuth } from '../../api/auth/CheckAuth.js';
//Custom Schema import
import { tableHandles } from '../../api/DBSchema/DBTOC.js';

//Begin code
let dataTable;
let tableHandle = {
			'main': Meteor.users,
			'schema': {
				'_id': {type: String, label: 'ID'},
				'email': { type: [Object], minCount: 1},
				"email.$.address": { type: String, label: '電郵' },
				"profile.firstName": { type: String, label: '姓' },
				"profile.lastName": { type: String, label: '名' },
				"profile.slackUserName": { type: String, label: 'Slack 用戶名稱' },
				"roles": {type: [String], label: '權限'},
				"createdAt": {type: Date, label: "創建日期"},
				"isActive": {type: Boolean, label: "活躍用戶"}
			},
			'view': {
				'_id': 'sysID',
				"email.$.address": 'text',
				"profile.firstName": 'text',
				"profile.lastName": 'text',
				"profile.slackUserName": 'text',
				"roles": 'array',
				"createdAt": 'datetime',
				"isActive": 'boolean'
			},
			'download': new ValidatedMethod({
				name: 'User.download',
				mixins:  [LoggedInMixin, CallPromiseMixin],
				checkLoggedInError: {
					error: 'notLoggedIn',
					message: '用戶未有登入'
				},
				validate() { },
				run() {
					if (Meteor.isServer) {
						try { return Meteor.users.find().fetch() }
						catch(err) { throw new Meteor.Error('download-failed', err.message) }
					}
				}
			})
		}

class Store {
	@observable table = '' //Table/collection that is currently loading, specify by URL param
	@observable DBListQuery = '';
	@observable rolesAllowed = ['system.admin'];
	@observable queryDocCount = 0;
	@observable DBList = [];
	@observable tableView = []; //View = what field to show in from DBList
	@observable limit = 20; //how many rows to show initially
	@observable rowHeight = 24; //table row Height, do not change easily
	@observable rowWidth = window.innerWidth - 50;
	@action updateDocCount() { this.queryDocCount = Meteor.users.find().count() }

	@action updateDBList() {
		this.DBList = Meteor.users.find().fetch();
	}
	@action clearDBList() {
		this.DBList.clear();
		this.addLimit(true);
	}
	@action setRowDimensions(w,h) {
		this.rowWidth=w;
		this.rowHeight=h;
	 }
	@action addLimit(reset, lim) {
		if (reset) { this.limit = 20 }
		else {
			if (lim) { this.limit = lim }
			else {this.limit = this.limit + 10;}
		}
	}

	@action async changeTable() {
		//reset store
		this.tableView = Object.keys(tableHandle['view']).filter((v) => {
			return (!v.includes('.$.') && !_.isPlainObject(tableHandle['view'][v]))
		});
		this.limit = 20;
		this.queryDocCount = 0;
		this.updateDocCount();
	}
}
const store = new Store();

class editDialog {
	@observable currentDocIndex = '';
	@observable roleList = [];
	@observable profile = {
		firstName: 'aaa',
		lastName: '',
		slackUserName: '',
		email: '',
		roles: [],
		isActive: false
	}
	@observable show= false;
	@action setShow(b) { this.show = b }
	@action setCurrentDocIndex(i) { this.currentDocIndex = i }
	@action updateVal(v, newVar) { this.profile[v] = newVar }
	@action removeRole(r) { this.profile['roles'].splice(this.profile['roles'].findIndex((a)=> { return a==r}), 1)}
	@action addRole(r) { this.profile['roles'].push(r) }
	@action updateRoleList(l) {this.roleList = l}
}
const ed = new editDialog();

let sync_DBList = null;

@observer export default class AdminDocList extends Component {
	constructor(props) { super(props) }

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

	async componentWillMount() {
		const a = await this.verifyUser(store.rolesAllowed);
		store.changeTable(); //Store.changeMode will handle error path by re-direct to /404

		Meteor.subscribe('user.ALL', {
			onReady: () => { store.updateDBList() },
			onStop: (e) => { console.log(e) }
		});
	}

	async componentWillReceiveProps(nextProps) {
		store.changeTable();
		this.forceUpdate();
	}

	componentWillUnmount() {
	}

	handleDownloadCSV(a) {
		const csv = Papa.unparse(a);
		const b = new Blob([csv], { type: "text/plain;charset=utf-8;" });
      	FileSaver.saveAs(b, store.DBListQuery+".csv");
	}

	async handleDownloadCSVAll() {
		const a = await tableHandle['download'].callPromise();
		this.handleDownloadCSV(a);
	}

	cellRenderer(isHeader, value, fieldView, key, field) {
		const contentType = (isHeader)?'header':'content'
		if (isHeader) {
			switch(fieldView) {
				case 'sysID':
				case 'numID':
				case 'date':
				case 'datetime':
				case 'text':
				case 'longText':
				case 'currency':
				case 'integer':
				case 'decimal':
				case 'url':
				case 'status':
				case 'user':
				case 'boolean':
				case 'array':
					return <div key={key} style={fieldStyle[fieldView][contentType]}> { value } </div>;
				case 'icon':
					return <div> Error: please manually handle icons </div>;
				default:
					return 'Error: fieldView unknown';
			}
		} else {
			switch(fieldView) {
				case 'sysID':
				case 'numID':
				case 'integer':
				case 'decimal':
				case 'url':
				case 'text':
				case 'longText':
					return <div key={key} style={fieldStyle[fieldView][contentType]} > { value } </div>;
				case 'icon':
					return <div> Error: please manually handle icons </div>;
				case 'date':
					return <div key={key} style={fieldStyle[fieldView][contentType]} > {(value==undefined) ? '---' :  moment(value).format("YYYY-MM-DD") } </div>
				case 'datetime':
					return <div key={key} style={fieldStyle[fieldView][contentType]} > {(value==undefined) ? '---' :  moment(value).format("YYYY-MM-DD HH:mm") } </div>
				case 'currency':
					return <div key={key} style={fieldStyle[fieldView][contentType]} >{accounting.formatColumn([value,"999999"], "$", 2)[0] } </div>
				case 'status':
					return <div key={key} style={fieldStyle[fieldView][contentType]} >{value}</div>;
				case 'user':
					return <div key={key} style={fieldStyle[fieldView][contentType]} ><UserChip userId={value} /></div>;
				case 'boolean':
					return <div key={key} style={fieldStyle[fieldView][contentType]} >{(value)? <FontIcon className="fa fa-check" /> : <FontIcon className="fa fa-times" />}</div>;
				case 'array':
					return <div key={key} style={fieldStyle[fieldView][contentType]} > { value.toJS().toString() } </div>;
				default:
					return 'Error: fieldView unknown';
			}
		}
	}

	rowRenderer({ index, isScrolling, key, style }) {
		/* row level code */
		let rowStyle = style;
		let rowClass = "datatable_row";
		const row = store.DBList[index];
		if ((index % 2) == 0) { rowStyle = _.extend(rowStyle, tableStyle.evenRow) }

		let checkBox;
		let setToButton, deleteButton = false;

		return (
			<div className={rowClass} key={key} style={rowStyle}>
				{store.tableView.map((a, index) => {
					if (a.includes('.')) {
						const b = a.split('.')
						return this.cellRenderer(false, row[b[0]][b[1]], tableHandle['view'][a], key+'-'+index)
					}
					else { return this.cellRenderer(false, row[a], tableHandle['view'][a], key+'-'+index) }
				})}
				<IconMenu
					style={{height: '24px'}}
					iconButtonElement={<IconButton style={fieldStyle.muiIconElement}><FontIcon className="fa fa-ellipsis-v" /></IconButton>}
					anchorOrigin={{horizontal: 'right', vertical: 'top'}}
					targetOrigin={{horizontal: 'right', vertical: 'top'}}
				>
					<MenuItem value={1} primaryText="修改" leftIcon={<FontIcon className="fa fa-pencil" />} onTouchTap={(e) => {
						this.editUser(index);
						ed.setShow(true);
					}} />

					<MenuItem value={2} primaryText="重設password" leftIcon={<FontIcon className="fa fa-trash-o" />} onTouchTap={(e) => this.deleteDoc(row)} />
				</IconMenu>
			</div>
		)
	}

	editUser(index) {
		ed.updateRoleList(Meteor.roles.find().fetch())
		console.log(ed.roleList)
		ed.updateVal('firstName', store.DBList[index].profile.firstName);
		ed.updateVal('lastName', store.DBList[index].profile.lastName);
		ed.updateVal('slackUserName', store.DBList[index].profile.slackUserName);
		ed.updateVal('email', store.DBList[index].emails[0].address);
		ed.updateVal('roles', store.DBList[index].roles);
		ed.updateVal('isActive', store.DBList[index].isActive);
		ed.setCurrentDocIndex(index);
	}

	render() {
		let pageHeader = '用戶列表';
		console.log(Meteor.roles.find().fetch())
		return (
			<div>
				<div className="row-left">
					<h1>{pageHeader}</h1>
				</div>
				<div className="row-left">
					<div className="widget table-container widget-1col ">
						<Card style={{ flex: '1 1 auto' }}>
							<CardText>
								<Measure bounds onResize={(contentRect) => {
									store.setRowDimensions(contentRect.bounds.width, contentRect.bounds.height)
								}}>
									{({ measureRef }) => (
										<div ref={measureRef} className="datatable_headerRow">
											{store.tableView.map((a) => this.cellRenderer(true, tableHandle['schema'][a].label, tableHandle['view'][a], a+'_head', a))}
											<div style={fieldStyle.icon.header}></div>
										</div>
									)}
								</Measure>
								<List
									noRowsRenderer={() => { <div>沒有相關記錄</div> }}
									ref={(registerChild) => dataTable = registerChild}
									width={Session.get("windowWidth")==undefined ? window.innerWidth-50: Session.get("windowWidth")-50}
									height={Math.min(400, store.rowHeight*store.DBList.length)}
									rowCount={store.DBList.length}
									rowHeight={store.rowHeight}
									rowRenderer={({ index, isScrolling, key, style }) => this.rowRenderer(({ index, isScrolling, key, style })) }
								/>
							</CardText>
						</Card>
						<Dialog
							actions={[
								<RaisedButton label="OK" className="button" primary={true} onTouchTap={() => {
									ed.setShow(false);
									this.saveChange();
								}} />,
								<RaisedButton label="Cancel" className="button" primary={true} onTouchTap={() => ed.setShow(false)} />
							]}
							modal={true}
							open={ed.show}
							onRequestClose={() => ed.setShow(false)}
						>
							<div className="widget widget-1col">
								<TextField className="default-textField" name='firstName' hintText="請輸入文字" value={ed.profile['firstName']} floatingLabelText='姓' onChange={(e) => ed.updateVal('firstName', e.target.value)}
								/>
								<TextField className="default-textField" name='lastName' hintText="請輸入文字" value={ed.profile['lastName']} floatingLabelText='名' onChange={(e) => ed.updateVal('lastName', e.target.value)}
								/>
								<TextField className="default-textField" name='slackUserName' hintText="請輸入文字" value={ed.profile['slackUserName']} floatingLabelText='Slack 用戶名稱' onChange={(e) => ed.updateVal('slackUserName', e.target.value)}
								/>
								<TextField className="default-textField" name='email' hintText="請輸入文字" value={ed.profile['email']} floatingLabelText='電郵' onChange={(e) => ed.updateVal('email', e.target.value)}
								/>
								<Checkbox name='isActive' label='活躍用戶' checked={ed.profile['isActive']} onCheck={(e, isInputChecked) => ed.updateVal('isActive', isInputChecked)}/>
								<h3>權限</h3>
								<ListM>
									{ed.profile['roles'].map((a)=> {
										return <ListItem primaryText={a} rightIcon={<FontIcon className="fa fa-trash" onTouchTap={()=> {ed.removeRole(a)}} />} />}
									)}
								</ListM>
								{(ed.roleList.length<1) && <AutoComplete className="default-textField" floatingLabelText='新增權限' name='addRoles' filter={AutoComplete.fuzzyFilter} openOnFocus={true} maxSearchResults={5}
									style={comStyle} menuStyle={comStyle} listStyle={comStyle}
									dataSource={ed.roleList.toJS()}
									onNewRequest={(v, i) => { ed.addRole(v) }}
								/>}
							</div>
						</Dialog>
					</div>
				</div>
			</div>
		)
	}
}
