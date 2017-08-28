//This is the standard DocList, also use for admin module

//Call with
{/* <DocList
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
	docLoadPath={'/DocLoad/1/'}
	setShowCommonDialog={this.props.setShowCommonDialog}
	setCommonDialogMsg={this.props.setCommonDialogMsg}
	setShowSnackBar={this.props.setShowSnackBar}
	setSnackBarMsg={this.props.setSnackBarMsg}
	setSnackBarAction={this.props.setSnackBarAction}
/> */}

//Basic React/Meteor/mobx import
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session'
import { browserHistory } from 'react-router';
import { observer } from "mobx-react";
import mobx, { observable, useStrict, action } from 'mobx';
import { autorunX, observeX } from '../../api/tracker-mobx-autorun.js'
useStrict(true);
//Material-ui import
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
//Package ad-hoc function import
import 'react-virtualized/styles.css'
import { InfiniteLoader, List } from 'react-virtualized'
import Measure from 'react-measure';
//Custom formatting/component import
import { tableStyle, fieldStyle, buttonStyle} from '../theme/ThemeSelector.js';
import TableFilterSortChip  from '../component/TableFilterSortChip.js';
import FilterDialog from '../component/FilterDialog.js';
//Custom function import
import { checkAuth } from '../../api/auth/CheckAuth.js';
import { cleanObject } from '../../api/helper.js';
import { cellRenderer, handleDownloadCSV } from './DocListHelper.js';
//Custom Schema import
import { tableHandles } from '../../api/DBSchema/DBTOC.js';

//Begin code
let dataTable;
let tableHandle;

class Store {
	@observable table = '' //Table/collection that is currently loading, specify by URL param
	@observable DBListQuery = '';
	@observable rolesAllowed = [{role: 'admin', group: 'SYSTEM'}];
	@observable queryDocCount = 0;
	@observable DBList = []; //DB extract to show in table
	@observable tableView = []; //View = what field to show in from DBList
	@observable tableSort = {}; //Sort and filter use this
	@observable tableFilter = {}; //Sort and filter use this
	@observable tableHeaderCurrentItem = undefined; //Which field the sort/filter menu refers to
	@observable showTableMenu = false; //isOpen state for sort/filter menu
	@observable tableMenuAnchor = null; //display state for sort/filter menu
	@observable limit = 20; //how many rows to show initially
	@observable rowHeight = 24; //table row Height, do not change easily
	@observable isMultiSelectEnabled = false;
	@observable isMultiSelect = false;
	@observable multiSelected = [];
	@observable rowWidth = window.innerWidth - 50;
	@observable showFilterDialog = false;
	@observable allowNewDoc = false;
	@observable allowDownload = false;
	@observable allowDownloadAll = false;
	@observable allowMultiDelete = false;
	@observable cardTitle = '';
	@observable docLoadPath = '';

	@action setDocLoadPath(a) { this.docLoadPath = a }
	@action setCardTitle(a) { if (a===undefined) { this.cardTitle = ''} else { this.cardTitle = a }}
	@action setDownload(dl, dl_all) {
		this.allowDownload = dl;
		this.allowDownloadAll = dl_all;
	}
	@action setNewDoc(a) { this.allowNewDoc = a }
	@action setRolesAllowed(a) { this.rolesAllowed = a }
	@action setEnableMultiSelect(a) { this.isMultiSelectEnabled = a }
	@action setMultiDelete(a) { this.allowMultiDelete = a }

	@action updateDocCount() { tableHandle['count'].callPromise({'query': this.table+'.ALL', 'filter': this.tableFilter}).then(action((a) => this.queryDocCount = a)) }
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
		const f = ((tableHandle['view'][field]==='user') ? field.replace('Id', 'Name') : field);
		if (opType == 3) {this.tableFilter[f] = input}
		if (opType == 4) {
			this.tableFilter[f] = {};
			this.tableFilter[f]["$regex"] = ".*"+input+".*"
			this.tableFilter[f]["$options"] = "i"
		}
		if (opType == 1) {
			//means it contains a gte or lte
			if (_.isObject(this.tableFilter[f])) { this.tableFilter[f]['$gte'] = input}
			else { this.tableFilter[f] = {'$gte': input} }
		}
		if (opType == 2) {
			//means it contains a gte or lte
			if (_.isObject(this.tableFilter[f])) { this.tableFilter[f]['$lte'] = input}
			else { this.tableFilter[f] = {'$lte': input} }
		}
		if (opType == -1) { this.tableFilter[f] = undefined }
		this.addLimit(true);
		this.toggleMultiSelect(false);
		this.updateDocCount();
	}

	@action async changeTable(m, includeFields, limit, query) {
		//reset store
		this.tableSort = {};
		this.tableFilter = {};
		if (includeFields === undefined) { //if fields to show specified, then show specified fields
			this.tableView = Object.keys(tableHandle['view']).filter((v) => {
				return (!v.includes('.$.') && !_.isPlainObject(tableHandle['view'][v]))
			});
		} else { // otherwise show all fields
			this.tableView = Object.keys(tableHandle['view']).filter((v) => {
				return (!v.includes('.$.') && !_.isPlainObject(tableHandle['view'][v]) && includeFields.includes(v))
			});
		}
		this.tableHeaderCurrentItem = undefined;
		this.showTableMenu = false;
		this.tableMenuAnchor = null;
		this.limit = limit;
		this.queryDocCount = 0;
		this.isMultiSelect = false;
		this.multiSelected = [];
		this.tableSort = this.tableView.reduce((result, i) => {
			const f = ((tableHandle['view'][i]==='user') ? i.replace('Id', 'Name') : i);
			return Object.assign(result, {[f]: undefined})
		}, {});
		this.tableFilter = Object.assign({}, this.tableSort);
		this.table = m;
		this.DBListQuery = query
		this.updateDocCount();
	}
}
const store = new Store();
const setTableMenu = (isOpen, anchor, field) => store.setTableMenu(isOpen, anchor, field);
let sync_DBList = null;

@observer export default class DocList extends Component {
	constructor(props) { super(props) }

	async verifyUser(roles) {
		return new Promise(async (resolve, reject) => {
			try {
				const a = await checkAuth(roles)
				return resolve(true);
			}
			catch(err) { //On user issue, use master common dialog to display
				this.props.setCommonDialogMsg(err.message);
				this.props.setShowCommonDialog(true);
				browserHistory.push('/login');
				return reject(err);
			}
		});
	}

	async componentWillMount() {
		store.setRolesAllowed(this.props.rolesAllowed)
		let a = await this.verifyUser(store.rolesAllowed);
		tableHandle = tableHandles(this.props.table);
		//Store.changeMode will handle error path by re-direct to /404
		store.changeTable(this.props.table, this.props.includeFields, this.props.initLimit, this.props.query);
		store.setEnableMultiSelect(this.props.allowMultiSelect);
		store.setMultiDelete(this.props.allowMultiDelete);
		store.setDownload(this.props.allowDownload, this.props.allowDownloadAll);
		store.setNewDoc(this.props.allowNewDoc);
		store.setCardTitle(this.props.cardTitle);
		store.setDocLoadPath(this.props.docLoadPath);
		this.setMode();

		if (Meteor.isClient) { sync_DBList.start() }
	}

	async componentWillReceiveProps(nextProps) {
		if (Meteor.isClient) { sync_DBList.stop() }
		store.clearDBList();

		store.setRolesAllowed(nextProps.rolesAllowed)
		let a = await this.verifyUser(store.rolesAllowed);
		tableHandle = tableHandles(nextProps.table);
		//Store.changeMode will handle error path by re-direct to /404
		store.changeTable(nextProps.table, nextProps.includeFields, nextProps.initLimit, nextProps.query);
		store.setEnableMultiSelect(nextProps.allowMultiSelect);
		store.setMultiDelete(nextProps.allowMultiDelete);
		store.setDownload(nextProps.allowDownload, nextProps.allowDownloadAll);
		store.setNewDoc(nextProps.allowNewDoc);
		store.setCardTitle(nextProps.cardTitle);
		store.setDocLoadPath(nextProps.docLoadPath);
		this.setMode();

		if (Meteor.isClient) { sync_DBList.start() }
		this.forceUpdate();
	}

	componentWillUnmount() {
		if (Meteor.isClient) { sync_DBList.stop() }
	}

	async setMode() {
		sync_DBList = autorunX( () => { observeX(
			'admin.DBList.Autorun',
			store.DBList,
			Meteor.subscribe(store.DBListQuery, { limit: store.limit, sort: cleanObject(store.tableSort), filter: cleanObject(store.tableFilter)}), tableHandle['main'].find(cleanObject(store.tableFilter), { sort: cleanObject(store.tableSort), limit: store.limit })
		) } );
	}

	rowRenderer({ index, isScrolling, key, style }) {
		/* row level code */
		let rowStyle = style;
		let rowClass = "datatable_row";
		const row = store.DBList[index];
		if ((index % 2) == 0) { rowStyle = _.extend(rowStyle, tableStyle.evenRow) }

		let checkBox;
		let setToButton, deleteButton = false;

		if (store.isMultiSelect) {
			checkBox = <div style={fieldStyle.icon.content}><Checkbox style={fieldStyle.icon.content} labelStyle={{width: '0px'}} checked={store.multiSelected.findIndex((a)=>{ return a["_id"]==row["_id"] } ) >-1 } onCheck={(e) => store.toggleMultiSelectItem(row["_id"])}/></div>
		} else {
			/* Universial buttons */
			viewButton = true;
			editButton = true;
			deleteButton = true;
		}
		return (
			<div className={rowClass} key={key} style={rowStyle}>
				{store.isMultiSelect && checkBox}
				{store.tableView.map((a, index) => cellRenderer(false, row[a], tableHandle['view'][a], key+'-'+index))}
				{!store.isMultiSelect && <IconMenu
					style={{height: '24px'}}
					iconButtonElement={<IconButton style={fieldStyle.muiIconElement}><FontIcon className="fa fa-ellipsis-v" /></IconButton>}
					anchorOrigin={{horizontal: 'right', vertical: 'top'}}
					targetOrigin={{horizontal: 'right', vertical: 'top'}}
				>
					{editButton && <MenuItem value={1} primaryText="查看" leftIcon={<FontIcon className="fa fa-search-plus" />} onTouchTap={(e) => browserHistory.push(store.docLoadPath + store.table + '/view/' + row["_id"])} />}

					{editButton && <MenuItem value={2} primaryText="修改" leftIcon={<FontIcon className="fa fa-pencil" />} onTouchTap={(e) => browserHistory.push(store.docLoadPath + store.table + '/edit/' + row["_id"])} />}

					{deleteButton && <MenuItem value={3} primaryText="删除" leftIcon={<FontIcon className="fa fa-trash-o" />} onTouchTap={(e) => this.deleteDoc(row)} />}
				</IconMenu>}
			</div>
		)
	}

	async deleteDoc(d) {
		try {
			if (Array.isArray(d)) {
				for (let d1 of d) {
					let a = await tableHandle['delete'].callPromise(d1['_id'])
					this.props.setSnackBarMsg(a);
					this.props.setSnackBarAction({}, '');
					this.props.setShowSnackBar(true);
				}
				store.toggleMultiSelect();
			}
			else {
				let a = await tableHandle['delete'].callPromise(d['_id'])
				this.props.setSnackBarMsg(a);
				this.props.setSnackBarAction({}, '');
				this.props.setShowSnackBar(true);
			}
		}
		catch(err) {
			this.props.setCommonDialogMsg(err.toString());
			this.props.setShowCommonDialog(true);
			store.submitting(false);
		}
	}

	tableAddFilterWarper(opType, input, field) { store.tableAddFilter(opType, input, field) }
	tableAddSortWarper(seq, field) { store.tableAddSort(seq, field) }

	render() {
		return (
			<div>
				<div className="widget table-container widget-1col ">
					<Card style={{ flex: '1 1 auto' }}>
						<CardTitle title={store.cardTitle} />
						<CardText>
							<div className="row-left">
								{Object.keys(store.tableSort).map((a) => {
									return <TableFilterSortChip type='sort' v={store.tableSort[a]} k={a} fieldName={tableHandle['schema'][a].label} onDel={this.tableAddSortWarper} />
								})}
								{Object.keys(store.tableFilter).map((a) => { return <TableFilterSortChip type='filter' v={store.tableFilter[a]} k={a} fieldName={tableHandle['schema'][a].label} onDel={this.tableAddFilterWarper} /> })}
							</div>
							<Measure bounds onResize={(contentRect) => {
								store.setRowDimensions(contentRect.bounds.width, contentRect.bounds.height)
							}}>
								{({ measureRef }) => (
									<div ref={measureRef} className="datatable_headerRow">
										{store.isMultiSelect && <div style={fieldStyle.icon.header}></div>}
										{store.tableView.map((a) => cellRenderer(true, tableHandle['schema'][a].label, tableHandle['view'][a], a+'_head', a, setTableMenu))}
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

							{store.isMultiSelectEnabled && <RaisedButton label={"多選"+((store.isMultiSelect)? "("+(store.multiSelected.length)+")": "")} style={buttonStyle} primary={!store.isMultiSelect} secondary={true} icon={<FontIcon className="fa fa-list " />} onTouchTap={() => store.toggleMultiSelect()} />}

							{store.isMultiSelect && store.allowMultiDelete && <RaisedButton label="複數刪除" style={buttonStyle} secondary={true} icon={<FontIcon className="fa fa-trash-o" />} onTouchTap={() => this.deleteDoc(store.multiSelected.toJS())} />}

							{!store.isMultiSelect && store.allowNewDoc && <RaisedButton label="新增" style={buttonStyle} primary={!store.isMultiSelect} secondary={true} icon={<FontIcon className="fa fa-plus" />} onTouchTap={() => browserHistory.push(this.props.docLoadPath + store.table + '/new')} />}

							{!store.isMultiSelect && store.allowDownload && <RaisedButton label={"下載CSV ("+store.DBList.length+")"} style={buttonStyle} primary={true} icon={<FontIcon className="fa fa-download" />} onTouchTap={() => handleDownloadCSV(store.DBList, store.cardTitle)} />}

							{!store.isMultiSelect && store.allowDownloadAll && <RaisedButton label={"下載所有記錄 ("+store.queryDocCount+")"} style={buttonStyle} primary={true} icon={<FontIcon className="fa fa-cloud-download" />} onTouchTap={async () => {
								a = await tableHandle['download'].callPromise({'query': store.DBListQuery, 'filter': store.tableFilter});
								handleDownloadCSV(a, store.cardTitle);
							}} />}
						</CardActions>
					</Card>
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
					title={(store.tableHeaderCurrentItem==undefined) ? '': tableHandle['schema'][store.tableHeaderCurrentItem].label}
					fieldType={(store.tableHeaderCurrentItem==undefined) ? '': tableHandle['view'][store.tableHeaderCurrentItem]}
					currentItem={store.tableHeaderCurrentItem}
					show={store.showFilterDialog}
					showController={() => store.setShowFilterDialog(false)}
					onSubmit={this.tableAddFilterWarper}
				/>
			</div>
		)
	}
}
