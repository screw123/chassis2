//Basic React/Meteor/mobx import
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session'
import { browserHistory, Link } from 'react-router';
import { observer } from "mobx-react";
import mobx, { observable, useStrict, action } from 'mobx';
import { autorunX, observeX } from '../../api/tracker-mobx-autorun'
useStrict(true);
//Material-ui import
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import FontIcon from 'material-ui/FontIcon';
import IconButton from 'material-ui/IconButton';
import IconMenu from 'material-ui/IconMenu';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
import Popover  from 'material-ui/Popover';
import Paper from 'material-ui/Paper';
import Dialog from 'material-ui/Dialog';
import Checkbox from 'material-ui/Checkbox';
import {Card, CardHeader, CardTitle, CardText, CardActions} from 'material-ui/Card';
import Chip from 'material-ui/Chip';
import Avatar from 'material-ui/Avatar';
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
import Claims, { ClaimsView, updateClaim, downloadClaim, qtyClaim } from '../../api/DBSchema/claims.js';
import Status from '../../api/DBSchema/status.js';

//Begin code
const today = moment();
let dataTable;

class Store {
	@observable mode = 'MyClaims'; //From URL, control what data to display
	@observable DBListQuery = '';
	@observable rolesAllowed = [];
	@observable queryDocCount = 0;
	@observable DBList = []; //DB extract to show in table
	@observable statusList = []; //Other needed DB to define as separate arrays
	@observable tableView = []; //View = what field to show in from DBList
	@observable tableSort = {}; //Sort and filter use this
	@observable tableFilter = {}; //Sort and filter use this
	@observable tableHeaderCurrentItem = undefined; //Which field the sort/filter menu refers to
	@observable showTableMenu = false; //isOpen state for sort/filter menu
	@observable tableMenuAnchor = null; //display state for sort/filter menu
	@observable limit = 20; //how many rows to show initially
	@observable rowHeight = 24; //table row Height, do not change easily
	@observable isMultiSelect = false;
	@observable multiSelected = [];
	@observable rowWidth = window.innerWidth - 50;
	@observable showFilterDialog = false;
	@action updateDocCount() { qtyClaim.callPromise({'query': this.DBListQuery, 'filter': this.tableFilter}).then(action((a) => this.queryDocCount = a)) }
	@action clearDBList() {
		this.DBList.clear();
		this.addLimit(true);
	}
	@action setShowFilterDialog(b) { this.showFilterDialog = b }
	@action setRowDimensions(w,h) {
		this.rowWidth=w;
		this.rowHeight=h;
	 }
	@action toggleMultiSelect(b) {
		if (b == undefined) {this.isMultiSelect = !this.isMultiSelect}
		else {this.isMultiSelect = b}
		if (!this.isMultiSelect) { this.multiSelected.clear() }
	}
	@action toggleMultiSelectItem(id) {
		const i = this.multiSelected.findIndex((a) => { return a['_id']==id })
		if (i==-1) { this.multiSelected.push(this.DBList.find((a) => {return a['_id']==id} )) }
		else { this.multiSelected.splice(i,1) }
		dataTable.forceUpdateGrid();
	}
	@action addLimit(reset, lim) {
		if (reset) { this.limit = 20 }
		else {
			if (lim) { this.limit = lim }
			else {this.limit = this.limit + 10;}
		}
	}
	@action setTableMenu(isOpen, anchor, field) {
		if (isOpen) {
			this.showTableMenu = true;
			this.tableMenuAnchor = anchor;
			this.tableHeaderCurrentItem = field;
		} else { this.showTableMenu = false }
	}
	@action tableAddSort(seq, field) {
		if (field == undefined) { this.tableSort[this.tableHeaderCurrentItem] = seq }
		else { this.tableSort[field] = seq }
		this.addLimit(true);
		this.toggleMultiSelect(false);
	 }
	@action tableAddFilter(opType, input, field) { // 1: gte; 2: lte, 3: eq, 4: like
		const f = ((ClaimsView[field]==='user') ? field.replace('Id', 'Name') : field);
		if (opType == 3) {this.tableFilter[f] = input}
		if (opType == 4) {
			this.tableFilter[f] = {};
			this.tableFilter[f]["$regex"] = ".*"+input+".*"
			this.tableFilter[f]["$options"] = "i"
		}
		if (opType == 1) {
			//means it contains a gte or lte
			if (_.isObject(this.tableFilter[f])) { this.tableFilter[f][$gte] = input}
			else { this.tableFilter[f] = {$gte: input} }
		}
		if (opType == 2) {
			//means it contains a gte or lte
			if (_.isObject(this.tableFilter[f])) { this.tableFilter[f][$lte] = input}
			else { this.tableFilter[f] = {$lte: input} }
		}
		if (opType == -1) { this.tableFilter[f] = undefined }
		this.addLimit(true);
		this.toggleMultiSelect(false);
		this.updateDocCount();
	}
	@action async changeMode(m) {
		//reset store
		this.tableSort = {};
		this.tableFilter = {};
		this.tableHeaderCurrentItem = undefined;
		this.showTableMenu = false;
		this.tableMenuAnchor = null;
		this.limit = 20;
		this.queryDocCount = 0;
		this.isMultiSelect = false;
		this.multiSelected = [];
		switch(m) {
			case undefined:
			case 'MyClaims':
				this.mode = 'MyClaims';
				this.DBListQuery = 'claims.MyClaims';
				this.rolesAllowed = ["staff.general"];
				this.tableView = ['docNum', 'createAt', 'projectCode', 'businessCode', 'claimDesc', 'totalClaimAmt', 'status'];
				break;
			case 'approve':
				this.mode = 'approve';
				this.DBListQuery = 'claims.PendingApprove';
				this.rolesAllowed = ["staff.general", "staff.boss"];
				this.tableView = ['docNum', 'userId', 'createAt', 'lastUpdate', 'projectCode', 'businessCode', 'claimDesc', 'totalClaimAmt']
				break;
			case 'listAll':
				this.mode = 'listAll';
				this.DBListQuery = 'claims.ALL';
				this.rolesAllowed = ["system.admin"];
				this.tableView = ['docNum', 'userId', 'createAt', 'projectCode', 'businessCode', 'claimDesc', 'totalClaimAmt', 'status']
				break;
			case 'onHold':
				this.mode = 'onHold';
				this.DBListQuery = 'claims.onHold';
				this.rolesAllowed = ["staff.general", "staff.boss"];
				this.tableView = ['docNum', 'createAt', 'projectCode', 'businessCode', 'claimDesc', 'totalClaimAmt', 'status']
				break;
			default:
				this.mode = '404';
				browserHistory.push('/404');
		}
		this.tableSort = this.tableView.reduce((result, i) => {
			const f = ((ClaimsView[i]==='user') ? i.replace('Id', 'Name') : i);
			return Object.assign(result, {[f]: undefined})
		}, {});
		this.tableFilter = Object.assign({}, this.tableSort);
		this.updateDocCount();
	}
}
const store = new Store();

class ConfirmDialog {
	@observable docNum = 0;
	@observable doc = null;
	@observable show= false;
	@action setShowConfirmDialog(b) { this.show = b }
	@action setDoc(doc, docNum) {
		this.doc = doc;
		this.docNum = docNum;
	}
	@action getDocNumList() {
		if (Number.isInteger(this.docNum)) { return this.docNum + ''}
		else { return this.docNum.join() }
	}
	@action isMultiDoc() { return (Number.isInteger(this.docNum)? false:true) }
}
const confirmDialog = new ConfirmDialog();

let sync_claimsList = null;
const sync_statusList = autorunX(() => { observeX('status.ALL.Autorun', store.statusList, Meteor.subscribe('status.ALL'), Status.find({}))});

@observer export default class ClaimList extends Component {
	constructor(props) { super(props) }

	async verifyUser(roles) {
		try { const a = await checkAuth(roles) }
		catch(err) { //On user issue, use master common dialog to display
			this.props.setCommonDialogMsg(err);
			this.props.setShowCommonDialog(true);
			browserHistory.push('/login');
			return;
		}
	}

	componentWillMount() {
		store.changeMode(this.props.params.mode); //Store.changeMode will handle error path by re-direct to /404
		this.setMode()
		if (Meteor.isClient) {
			sync_claimsList.start();
			sync_statusList.start();
		}
	}

	componentWillReceiveProps(nextProps) {
		store.clearDBList();
		if (Meteor.isClient) {
			sync_claimsList.stop();
		 }
		store.changeMode(nextProps.params.mode);
		this.setMode()
		if (Meteor.isClient) {
			sync_claimsList.start();
		}
		this.forceUpdate();
	}

	componentWillUnmount() {
		if (Meteor.isClient) {
			sync_claimsList.stop();
			sync_statusList.stop();
		 }
	}

	setMode() {
		this.verifyUser(store.rolesAllowed);
		sync_claimsList = autorunX(
			() => { observeX('claims.DBList.Autorun', store.DBList,
				Meteor.subscribe(store.DBListQuery, {
					limit: store.limit,
					sort: JSON.parse(JSON.stringify(store.tableSort)),
					filter: JSON.parse(JSON.stringify(store.tableFilter))
				}), Claims.find(JSON.parse(JSON.stringify(store.tableFilter)), {
					sort: JSON.parse(JSON.stringify(store.tableSort)),
					limit: store.limit
				})
			)}
		);
	}

	handleDownloadCSV(a) {
		const csv = Papa.unparse(a);
		const b = new Blob([csv], { type: "text/plain;charset=utf-8;" });
      	FileSaver.saveAs(b, store.DBListQuery+".csv");
	}

	async handleDownloadCSVAll() {
		const a = await downloadClaim.callPromise({'query': store.DBListQuery, 'filter': store.tableFilter});
		this.handleDownloadCSV(a);
	}

	async updateClaimStatus(id, status, msg) {
		try {
			const docNum = await updateClaim.callPromise({id: id, args: {status: status, statusDesc: this.getStatusLabel(status)} });
			const a = () => { browserHistory.push('/claims')};
			this.props.setSnackBarMsg('報銷 #' + docNum + msg);
			this.props.setSnackBarAction(a, '查看');
			this.props.setShowSnackBar(true);
		} catch (err) {
			this.props.setSnackBarMsg('Error: ' + err.message);
			const a = () => { }
			this.props.setSnackBarAction(a, '');
			this.props.setShowSnackBar(true);
		 }
	}

	getStatusLabel(s) {
		const w = store.statusList.filter( (r) => { return r.code == s })
		if ((w == undefined) || (w.length == 0)) { return "..." }
		else { return w[0].desc }
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
					return <div key={key} style={fieldStyle[fieldView][contentType]} onTouchTap={(e) => {
						e.preventDefault();
						store.setTableMenu(true, e.currentTarget, field);
					}}> { value } </div>;
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
					return <div key={key} style={fieldStyle[fieldView][contentType]} > { moment(value).format("YYYY-MM-DD") } </div>
				case 'datetime':
					return <div key={key} style={fieldStyle[fieldView][contentType]} > { moment(value).format("YYYY-MM-DD HH:mm") } </div>
				case 'currency':
					return <div key={key} style={fieldStyle[fieldView][contentType]} >{accounting.formatColumn([value,"999999"], "$", 2)[0] } </div>
				case 'status':
					return <div key={key} style={fieldStyle[fieldView][contentType]} ><StatusChip status={value} labelWord={ this.getStatusLabel(value)} /></div>;
				case 'user':
					return <div key={key} style={fieldStyle[fieldView][contentType]} ><UserChip userId={value} /></div>;
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
		let sendApproveButton, approveButton, checkAttachmentButton, viewButton, editButton, cancelButton, onHoldButton, unHoldButton = false;

		if (store.isMultiSelect) {
			checkBox = <div style={fieldStyle.icon.content}><Checkbox style={fieldStyle.icon.content} labelStyle={{width: '0px'}} checked={store.multiSelected.findIndex((a)=>{ return a["_id"]==row["_id"] } ) >-1 } onCheck={(e) => store.toggleMultiSelectItem(row["_id"])}/></div>
		} else {
			/* Universial buttons */
			viewButton = true;
			checkAttachmentButton = true;
			/* Buttons specific to certain views */
			switch(store.mode) {
				case 'approve':
					approveButton = true;
					editButton = true;
					cancelButton = true;
					onHoldButton = true;
					break;
				case 'listAll':
					break;
				case 'onHold':
					cancelButton = true;
					unHoldButton = true;
					break;
				default:  //include MyClaims
					if (row["status"] < 500) {
						editButton = true;
						cancelButton = true;
						onHoldButton = true;
					}
					if (row["status"] < 300) { sendApproveButton = true }
			}
		}
		return (
			<div className={rowClass} key={key} style={rowStyle}>
				{store.isMultiSelect && checkBox}
				{store.tableView.map((a, index) => this.cellRenderer(false, row[a], ClaimsView[a], key+'-'+index))}
				{!store.isMultiSelect && <IconMenu
					style={{height: '24px'}}
					iconButtonElement={<IconButton style={fieldStyle.muiIconElement}><FontIcon className="fa fa-ellipsis-v" /></IconButton>}
					anchorOrigin={{horizontal: 'right', vertical: 'top'}}
					targetOrigin={{horizontal: 'right', vertical: 'top'}}
				>
					{viewButton && <MenuItem value={1} primaryText="查看" leftIcon={<FontIcon className="fa fa-search-plus" />} onTouchTap={(e) => browserHistory.push('/claims/item/view/' + row["_id"])} />}

					{checkAttachmentButton && <MenuItem value={2} primaryText="查看附件" leftIcon={<FontIcon className="fa fa-paperclip" />} onTouchTap={(e) => window.open(row["doc"], "_blank", "location=0,menubar=0,toolbar=0,") } />}

					{sendApproveButton && <MenuItem value={3} primaryText="送批" leftIcon={<FontIcon className="fa fa-paper-plane" />} onTouchTap={(e) => this.updateClaimStatus(row["_id"], 300, this.getStatusLabel(300))} />}

					{approveButton && <MenuItem value={4} primaryText="批核" leftIcon={<FontIcon className="fa fa-check-square-o" />} onTouchTap={(e) => this.updateClaimStatus(row["_id"], 500, this.getStatusLabel(500))} />}

					{editButton && <MenuItem value={5} primaryText="修改" leftIcon={<FontIcon className="fa fa-pencil" />} onTouchTap={(e) => browserHistory.push('/claims/item/edit/' + row["_id"])} />}

					{cancelButton && <MenuItem value={6} primaryText="取消" leftIcon={<FontIcon className="fa fa-trash" />} onTouchTap={(e) => {
							confirmDialog.setDoc(row["_id"], row["docNum"]);
							confirmDialog.setShowConfirmDialog(true);
						}} />
					}

					{onHoldButton && <MenuItem value={7} primaryText="保留" leftIcon={<FontIcon className="fa fa-hand-paper-o" />} onTouchTap={(e) => {
							const newStatus = (row["status"]/10)+600;
							this.updateClaimStatus(row["_id"], newStatus, this.getStatusLabel(newStatus));
						}}/>
					}

					{unHoldButton && <MenuItem value={7} primaryText="恢復" leftIcon={<FontIcon className="fa fa-play-circle-o" />} onTouchTap={(e) => {
							const newStatus = (row["status"]-600)*10
							this.updateClaimStatus(row["_id"], newStatus, this.getStatusLabel(newStatus))
						}}/>
					}
				</IconMenu>}
			</div>
		)
	}

	multiSelectFunctionReducer() {
		let sendApproveButton, approveButton, cancelButton, onHoldButton, unHoldButton;
		if (!store.isMultiSelect || store.multiSelected.length == 0) { return undefined }
		else {
			switch(store.mode) {
				case 'approve':
					approveButton = true
					cancelButton = true
					onHoldButton = true
					break;
				case 'listAll':
					break;
				case 'onHold':
					cancelButton = true
					unHoldButton = true
					break;
				default:  //include MyClaims
					cancelButton = store.multiSelected.every((v,i)=>{ return v.status < 500 }, true)
					onHoldButton = store.multiSelected.every((v,i)=>{ return v.status < 500 }, true)
					sendApproveButton = store.multiSelected.every((v,i)=>{ return v.status < 300 }, true)
			}

			if (sendApproveButton) {
				sendApproveButton = <RaisedButton label="送批" style={buttonStyle} secondary={true} icon={<FontIcon className="fa fa-paper-plane" />} onTouchTap={() => {
					store.multiSelected.forEach((v)=> { this.updateClaimStatus(v["_id"], 300, this.getStatusLabel(300)) });
					store.toggleMultiSelect();
				}} />
			}
			if (approveButton) {
				approveButton = <RaisedButton label="批核" style={buttonStyle} secondary={true} icon={<FontIcon className="fa fa-check-square-o" />} onTouchTap={() => {
					store.multiSelected.forEach((v)=> { this.updateClaimStatus(v["_id"], 500, this.getStatusLabel(500)) });
					store.toggleMultiSelect();
				}} />
			}
			if (cancelButton) {
				cancelButton = <RaisedButton label="取消" style={buttonStyle} secondary={true} icon={<FontIcon className="fa fa-trash" />} onTouchTap={() => { confirmDialog.setDoc(
							store.multiSelected.reduce( (acc,v) => { return acc.concat(v['_id'])}, [] ),
							store.multiSelected.reduce( (acc,v) => { return acc.concat(v['docNum'])}, [] )
						);
						confirmDialog.setShowConfirmDialog(true);
					}
				} />
			}
			if (onHoldButton) {
				onHoldButton = <RaisedButton label="保留" style={buttonStyle} secondary={true} icon={<FontIcon className="fa fa-hand-paper-o" />} onTouchTap={() => {
					store.multiSelected.forEach((v)=> {
						const newStatus = (v["status"]/10)+600
						this.updateClaimStatus(v["_id"], newStatus, this.getStatusLabel(newStatus))
					});
					store.toggleMultiSelect();
				}} />
			}
			if (unHoldButton) {
				unHoldButton = <RaisedButton label="恢復" style={buttonStyle} secondary={true} icon={<FontIcon className="fa fa-play-circle-o" />} onTouchTap={() => {
					store.multiSelected.forEach((v)=> {
						const newStatus = (v["status"]-600)*10
						this.updateClaimStatus(v["_id"], newStatus, this.getStatusLabel(newStatus))
					});
					store.toggleMultiSelect();
				}} />
			}
		}
		return [sendApproveButton, approveButton, cancelButton, onHoldButton, unHoldButton]
	}

	tableAddFilterWarper(opType, input, field) { store.tableAddFilter(opType, input, field) }
	tableAddSortWarper(seq, field) { store.tableAddSort(seq, field) }

	render() {
		let pageHeader = '我的報銷';
		let cardTitle = '過去365日的報銷記錄';
		switch(store.mode) {
			case 'approve':
				pageHeader = '報銷批核';
				cardTitle = '待批核的報銷單';
				break;
			case 'listAll':
				pageHeader = '報銷列表';
				cardTitle = '所有報銷單總表';
				break;
			case 'onHold':
				pageHeader = '保留報銷';
				cardTitle = '所有狀態為"保留"的報銷單';
				break;
			default:

		}
		return (
			<div>
				<div className="row-left">
					<h1>{pageHeader}</h1>
				</div>
				<div className="row-left">
					<div className="widget table-container widget-1col ">
						<Card style={{ flex: '1 1 auto' }}>
							<CardTitle title={cardTitle} />
							<CardText>
								<div className="row-left">
									{Object.keys(store.tableSort).map((a) => { return <TableFilterSortChip type='sort' v={store.tableSort[a]} k={a} fieldName={Claims.simpleSchema().label()[a]} onDel={this.tableAddSortWarper} /> })}
									{Object.keys(store.tableFilter).map((a) => { return <TableFilterSortChip type='filter' v={store.tableFilter[a]} k={a} fieldName={Claims.simpleSchema().label()[a]} onDel={this.tableAddFilterWarper} /> })}
								</div>
								<Measure bounds onResize={(contentRect) => {
									store.setRowDimensions(contentRect.bounds.width, contentRect.bounds.height)
								}}>
									{({ measureRef }) => (
										<div ref={measureRef} className="datatable_headerRow">
											{store.isMultiSelect && <div style={fieldStyle.icon.header}></div>}
											{store.tableView.map((a) => this.cellRenderer(true, Claims.simpleSchema().label()[a], ClaimsView[a], a+'_head', a))}
											{!store.isMultiSelect && <div style={fieldStyle.icon.header}></div>}
										</div>
									)}
								</Measure>
								<InfiniteLoader
									isRowLoaded={({index}) => !!store.DBList[index]}
									loadMoreRows={(start, stop) => store.addLimit()}
									rowCount={store.DBList.length+1}
									threshold={1}
								>
									{({ onRowsRendered, registerChild }) => (
										<List
											onRowsRendered={onRowsRendered}
											noRowsRenderer={() => { <div>沒有相關記錄</div> }}
											ref={(registerChild) => dataTable = registerChild}
											width={Session.get("windowWidth")==undefined ? window.innerWidth-50: Session.get("windowWidth")-50}
											height={Math.min(400, store.rowHeight*store.DBList.length)}
											rowCount={store.DBList.length}
											rowHeight={store.rowHeight}
											rowRenderer={({ index, isScrolling, key, style }) => this.rowRenderer(({ index, isScrolling, key, style })) }
										/>
									)}
								</InfiniteLoader>
							</CardText>
							<CardActions>
								<RaisedButton label="多選" style={buttonStyle} primary={!store.isMultiSelect} secondary={true} icon={<FontIcon className="fa fa-list " />} onTouchTap={() => store.toggleMultiSelect()} />
								{this.multiSelectFunctionReducer()}
								<RaisedButton label={"下載CSV ("+store.DBList.length+")"} style={buttonStyle} primary={true} icon={<FontIcon className="fa fa-download" />} onTouchTap={() => this.handleDownloadCSV(store.DBList)} />
								<RaisedButton label={"下載所有記錄 ("+store.queryDocCount+")"} style={buttonStyle} primary={true} icon={<FontIcon className="fa fa-cloud-download" />} onTouchTap={() =>
									this.handleDownloadCSVAll()
								} />
							</CardActions>
						</Card>
					</div>
				</div>
				{/*Pop up menu for field sort/filter by clicking header start*/}
				<Popover
				  open={store.showTableMenu}
				  anchorEl={store.tableMenuAnchor}
				  onRequestClose={() => store.setTableMenu(false)}
				>
					<Menu>
						<MenuItem value={1} primaryText="過濾" leftIcon={<FontIcon className="fa fa-filter" />} onTouchTap={(e) => {
							store.setTableMenu(false);
							store.setShowFilterDialog(true);
						}} />
						<MenuItem value={2} primaryText="順排" leftIcon={<FontIcon className="fa fa-sort-alpha-asc" />} onTouchTap={(e) => {
							store.tableAddSort(1);
							store.setTableMenu(false);
						}} />
						<MenuItem value={3} primaryText="倒排" leftIcon={<FontIcon className="fa fa-sort-alpha-desc" />} onTouchTap={(e) => {
							store.tableAddSort(-1);
						 	store.setTableMenu(false);
						}} />
					</Menu>
				</Popover>
				{/*Pop up menu for field sort/filter by clicking header end*/}
				<FilterDialog
					title={Claims.simpleSchema().label()[store.tableHeaderCurrentItem]}
					fieldType={ClaimsView[store.tableHeaderCurrentItem]}
					currentItem={store.tableHeaderCurrentItem}
					show={store.showFilterDialog}
					showController={() => store.setShowFilterDialog(false)}
					onSubmit={this.tableAddFilterWarper}
				/>
				{/*Dialog for change doc state to 900 start*/}
				<Dialog
					actions={[
						<RaisedButton label="是" className="button" primary={true} style={buttonStyle} onTouchTap={() => {
							confirmDialog.setShowConfirmDialog(false);
							if (confirmDialog.isMultiDoc()) {
								confirmDialog.doc.map((v)=> this.updateClaimStatus(v, 900, '已取消'));
								store.toggleMultiSelect();
							 }
							else { this.updateClaimStatus(confirmDialog.doc, 900, '已取消') }
						}} />,
						<RaisedButton label="否" className="button" primary={true} style={buttonStyle} onTouchTap={() => confirmDialog.setShowConfirmDialog(false)} />
					]}
					modal={true}
					open={confirmDialog.show}
					onRequestClose={() => confirmDialog.setShowConfirmDialog(false)}
				>
					是否確定取消 #{confirmDialog.getDocNumList()} 報銷單?
				</Dialog>
				{/*Dialog for change doc state to 900 end*/}
			</div>
		)
	}
}
