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
	@observable isMultiSelect = false;
	@observable multiSelected = [];
	@observable rowWidth = window.innerWidth - 50;
	@observable showFilterDialog = false;
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
		console.log("setTableMenu")
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
	@action async changeTable(m) {
		//reset store
		this.tableSort = {};
		this.tableFilter = {};
		this.tableView = Object.keys(tableHandle['view']).filter((v) => {
			console.log(tableHandle['view'][v] + ': ' + ".$.=" + v.includes('.$.')+", isObject="+_.isObject(tableHandle['view'][v] ));
			return (!v.includes('.$.') && !_.isPlainObject(tableHandle['view'][v]))
		});
		this.tableHeaderCurrentItem = undefined;
		this.showTableMenu = false;
		this.tableMenuAnchor = null;
		this.limit = 20;
		this.queryDocCount = 0;
		this.isMultiSelect = false;
		this.multiSelected = [];
		this.tableSort = this.tableView.reduce((result, i) => {
			const f = ((tableHandle['view'][i]==='user') ? i.replace('Id', 'Name') : i);
			return Object.assign(result, {[f]: undefined})
		}, {});
		this.tableFilter = Object.assign({}, this.tableSort);
		this.table = m;
		this.DBListQuery = m+'.ALL'
		this.updateDocCount();
	}
}
const store = new Store();
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
		tableHandle = tableHandles(this.props.params.tableName);
		store.changeTable(this.props.params.tableName); //Store.changeMode will handle error path by re-direct to /404
		const a = await this.setMode();
		if (Meteor.isClient) {
			sync_DBList.start();
		}
	}

	async componentWillReceiveProps(nextProps) {
		store.clearDBList();
		if (Meteor.isClient) {
			sync_DBList.stop();
		 }
		store.changeTable(nextProps.params.tableName);
		const a = await this.setMode();
		if (Meteor.isClient) {
			sync_DBList.start();
		}
		this.forceUpdate();
	}

	componentWillUnmount() {
		if (Meteor.isClient) { sync_DBList.stop() }
	}

	async setMode() {
		const a = await this.verifyUser(store.rolesAllowed);
		sync_DBList = autorunX(
			() => { observeX('admin.DBList.Autorun', store.DBList,
				Meteor.subscribe(store.DBListQuery, {
					limit: store.limit,
					sort: JSON.parse(JSON.stringify(store.tableSort)),
					filter: JSON.parse(JSON.stringify(store.tableFilter))
				}), tableHandle['main'].find(JSON.parse(JSON.stringify(store.tableFilter)), {
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
		const a = await tableHandle['download'].callPromise({'query': store.DBListQuery, 'filter': store.tableFilter});
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
				{store.tableView.map((a, index) => this.cellRenderer(false, row[a], tableHandle['view'][a], key+'-'+index,a))}
				{!store.isMultiSelect && <IconMenu
					style={{height: '24px'}}
					iconButtonElement={<IconButton style={fieldStyle.muiIconElement}><FontIcon className="fa fa-ellipsis-v" /></IconButton>}
					anchorOrigin={{horizontal: 'right', vertical: 'top'}}
					targetOrigin={{horizontal: 'right', vertical: 'top'}}
				>
					{editButton && <MenuItem value={1} primaryText="查看" leftIcon={<FontIcon className="fa fa-search-plus" />} onTouchTap={(e) => browserHistory.push('/admin/DocLoad/'+ store.table + '/view/' + row["_id"])} />}

					{editButton && <MenuItem value={2} primaryText="修改" leftIcon={<FontIcon className="fa fa-pencil" />} onTouchTap={(e) => browserHistory.push('/admin/DocLoad/'+ store.table + '/edit/' + row["_id"])} />}

					{deleteButton && <MenuItem value={3} primaryText="删除" leftIcon={<FontIcon className="fa fa-trash-o" />} onTouchTap={(e) => this.deleteDoc(row)} />}
				</IconMenu>}
			</div>
		)
	}

	async deleteDoc(d) {
		if (Array.isArray(d)) {
			try {
				for (let d1 of d) {
					let a = await tableHandle['delete'].callPromise(d1['_id'])
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
			store.toggleMultiSelect();
		}
		else {
			try {
				let a = await tableHandle['delete'].callPromise(d['_id'])
				this.props.setSnackBarMsg(a);
				this.props.setSnackBarAction({}, '');
				this.props.setShowSnackBar(true);
			}
			catch(err) {
				this.props.setCommonDialogMsg(err.toString());
				this.props.setShowCommonDialog(true);
				store.submitting(false);
			}
		}
	}

	tableAddFilterWarper(opType, input, field) { store.tableAddFilter(opType, input, field) }
	tableAddSortWarper(seq, field) { store.tableAddSort(seq, field) }

	render() {
		let pageHeader = '數據庫列表';
		let cardTitle = _.upperCase(store.table);
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
											{store.tableView.map((a) => this.cellRenderer(true, tableHandle['schema'][a].label, tableHandle['view'][a], a+'_head', a))}
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

								<RaisedButton label={"多選"+((store.isMultiSelect)? "("+(store.multiSelected.length)+")": "")} style={buttonStyle} primary={!store.isMultiSelect} secondary={true} icon={<FontIcon className="fa fa-list " />} onTouchTap={() => store.toggleMultiSelect()} />

								{store.isMultiSelect && <RaisedButton label="複數刪除" style={buttonStyle} secondary={true} icon={<FontIcon className="fa fa-trash-o" />} onTouchTap={() => this.deleteDoc(store.multiSelected.toJS())} />}

								{!store.isMultiSelect && <RaisedButton label="新增" style={buttonStyle} primary={!store.isMultiSelect} secondary={true} icon={<FontIcon className="fa fa-plus" />} onTouchTap={() => browserHistory.push('/admin/DocLoad/'+ store.table + '/new')} />}

								{!store.isMultiSelect && <RaisedButton label={"下載CSV ("+store.DBList.length+")"} style={buttonStyle} primary={true} icon={<FontIcon className="fa fa-download" />} onTouchTap={() => this.handleDownloadCSV(store.DBList)} />}

								{!store.isMultiSelect && <RaisedButton label={"下載所有記錄 ("+store.queryDocCount+")"} style={buttonStyle} primary={true} icon={<FontIcon className="fa fa-cloud-download" />} onTouchTap={() =>
									this.handleDownloadCSVAll()
								} />}
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
					title={(store.tableHeaderCurrentItem==undefined) ? '': tableHandle['schema'][store.tableHeaderCurrentItem].label}
					fieldType={(store.tableHeaderCurrentItem==undefined) ? '': tableHandle['view'][store.tableHeaderCurrentItem]}
					currentItem={store.tableHeaderCurrentItem}
					show={store.showFilterDialog}
					showController={() => store.setShowFilterDialog(false)}
					onSubmit={this.tableAddFilterWarper}
				/>
				{/*Dialog for change doc state to 900 start*/}
			</div>
		)
	}
}
