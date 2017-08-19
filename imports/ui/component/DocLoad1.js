//DocLoad1

//This is the standard DocLoad, also use for admin module
//Nothing is started, fixme

//Basic React/Meteor/mobx import
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { browserHistory, Link } from 'react-router';
import { observer } from "mobx-react";
import mobx, { observable, useStrict, action } from 'mobx';
import { autorunX, observeX } from '../../api/tracker-mobx-autorun'
useStrict(true);
//Material-ui import
import RaisedButton from 'material-ui/RaisedButton';
import FontIcon from 'material-ui/FontIcon';
import Dialog from 'material-ui/Dialog';
//Package ad-hoc function import
import 'react-virtualized/styles.css'
import { InfiniteLoader, List } from 'react-virtualized'
import Measure from 'react-measure';
import moment from 'moment';
import accounting from 'accounting';
//Custom formatting/component import
import { tableStyle, fieldStyle } from '../theme/ThemeSelector.js';
import UserChip from './UserChip.js';
//Custom function import
import { checkAuth } from '../../api/auth/CheckAuth.js';
//Custom Schema import
import { tableHandles } from '../../api/DBSchema/DBTOC.js';
import { getDefaultValue, updateVal, fieldRenderer, subTableCellRenderer, uploadPic, fieldsToDBFilter } from './DocLoadHelper.js';

//Begin code
let tableHandle;
let dataTable;

class Store {
	@observable table = ''; //table name
	@observable mode = 'loading'; //view, edit or new
	@observable docId = '';

	@observable lookupList = {}; //store autocomplete lookup list
	@observable searchText = {};

	@observable fields = []; //{name: n, type: t}
	@observable fieldsValue = {};
	@observable fieldsErr = {};

	@observable subTableLines = [];
	@observable subTableFields = [];
	@observable subTableFieldsValue = {};
	@observable subTableFieldsErr = {};

	@observable rowHeight = 24; //table row Height, do not change easily
	@observable rowWidth = window.innerWidth - 50;
	@observable formSubmitting = false;
	@observable loadDocHandler = undefined;
	@observable rolesAllowed = [];

	@action setRolesAllowed(a) { this.rolesAllowed = a }
	@action submitting(b) {this.formSubmitting = b}

	@action setRowDimensions(w,h) {
		this.rowWidth=w;
		this.rowHeight=h;
	 }

	@action changeDoc(t, m, d, includeFields, providedLookupList) { //t=table name, m=mode, d = docID, includedFields = array of field name vs DBTOC['view']
		console.log('DocLoad1.changeDoc.providedLookupList', providedLookupList)
		this.table = t;
		this.mode = m;

		//Create view
		let subTableFields = [];
		let fields = [];
		let lookupList = {};
		let searchText = {};
		let fieldsToInclude = [];

		//if fields to show specified, then show specified fields, else show all
		if (includeFields === undefined) { Object.keys(tableHandle['view']).forEach((v)=>fieldsToInclude.push(v)) }
		else { fieldsToInclude = includeFields }

		//compile field list for both main table and subtable.  Only support single subtable in a document
		fieldsToInclude.forEach((v) => {
			if (v.includes('.$.')) { //subtable
				if (_.isPlainObject(tableHandle['view'][v])) {
					let type = tableHandle['view'][v][type];
					subTableFields.push({name: v, type: 'autocomplete'})
					subTableFields.splice(subTableFields.findIndex((x) => {return x == v['key']}) - 1, 1)
					subTableFields.splice(subTableFields.findIndex((x) => {return x == v['value']}) - 1, 1)
					searchText[v] = '';
					Meteor.call(tableHandle['view'][v]['link']['q'], (error, result) => {
						if (error) { console.log('store.changeDoc.createFieldList.subtable',error) }
						else {this.updateLookupList(v, result) }
					});
				}
				else { subTableFields.push({name: v, type: tableHandle['view'][v]}) }
			}
			else {
				if (_.isPlainObject(tableHandle['view'][v])) {
					fields.push({name: v, type: 'autocomplete'})
					fields.splice(fields.findIndex((x) => {return x == v['key']}) - 1, 1)
					fields.splice(fields.findIndex((x) => {return x == v['value']}) - 1, 1)
					searchText[v] = '';
					Meteor.call(tableHandle['view'][v]['link']['q'], (error, result) => {
						if (error) { console.log('store.changeDoc.createFieldList.table',error) }
						else {this.updateLookupList(v, result) }
					});
				}
				else { fields.push({name: v, type: tableHandle['view'][v]}) }
			}
			if (tableHandle['view'][v]=='foreignList') {
				this.updateLookupList(v, providedLookupList[v])
				searchText[v] = '';
			}
		});
		this.fields = fields;
		this.subTableFields = subTableFields;
		this.initForm();
		this.searchText = searchText;
		this.submitting(false);

		switch(m) {
			case 'new':
				this.mode = 'new';
				break;
			case 'edit':
				this.mode = 'edit';
				this.loadDocHandler = Meteor.subscribe(tableHandle['singleDoc'], {docId: d, filter: fieldsToDBFilter(fieldsToInclude)}, {
					onReady: () => { this.loadForm(d, fieldsToInclude) },
					onStop: (e) => { console.log(e) }
				});
				break;
			case 'view':
				this.mode = 'view';
				this.loadDocHandler = Meteor.subscribe(tableHandle['singleDoc'], {docId: d, filter: fieldsToDBFilter(fieldsToInclude)}, {
					onReady: () => { this.loadForm(d, fieldsToInclude) },
					onStop: (e) => { console.log(e) }
				});
				break;
			default:
				this.mode = '404';
				browserHistory.push('/404');
		}
	}

	@action updateLookupList(list, a) {
		this.lookupList[list] = a
	}

	@action initForm() { //initialize all form values and reset all errors
		let fieldsValue = {};
		let fieldsErr = {};
		let subTableFieldsValue = {};
		let subTableFieldsErr = {};
		this.fields.forEach((v) => {
			fieldsValue[v.name] = getDefaultValue(v.type);
			fieldsErr[v.name] = '';
		});
		this.subTableFields.forEach((v) => {
			subTableFieldsValue[v.name] = getDefaultValue(v.type);
			subTableFieldsErr[v.name] = '';
		});
		this.fieldsValue = fieldsValue;
		this.fieldsErr = fieldsErr;
		this.subTableFieldsValue = subTableFieldsValue;
		this.subTableFieldsErr = subTableFieldsErr;
	}

	@action loadForm(d, fieldsToInclude) {
		//should only be called by subscription callback, i.e. after data is ready on client.
		//Load data from minimongo into store, then stop subscription, i.e. data will not refresh

		const doc = tableHandle['main'].findOne({_id: d}, {filter: fieldsToDBFilter(fieldsToInclude)});
		if (doc === undefined) {
			this.mode = 'error';
			return;
		}

		Object.keys(doc).forEach((v)=> {
			//object in document can be plain value or object, object can be date or subTable
			if (doc[v] instanceof Date) {
				updateVal(this.fieldsValue, this.fieldsErr, tableHandle['view'][v], v, doc[v], tableHandle)
			} else if (typeof doc[v] === 'object') { //handle subtable, i.e. object but it's not "Date"
				let content = [];
				doc[v].forEach((a)=>{
					let row = {};
					Object.keys(a).forEach((b)=>{
						row[v+'.$.'+b] = a[b]
					})
					content.push(row);
				})
				this.subTableLines = content
			} else { //all number/text based fields
				switch(tableHandle['view'][v]) {
					case 'sysID':
						this.fieldsValue[v] = doc[v]  //override updateVal if field is _id
						break;
					case 'url': //fixme show preview of PDF/picture
						//const a = doc[v].split('/')
						//this.fieldsValue[v] = (a[a.length-1].length > 10)? (a[a.length-1].substring(0,9) + "..."): (a[a.length-1])
						this.fieldsValue[v] = doc[v];
						break;
					case 'text':
					case 'longText':
					case 'decimal':
					case 'currency':
					case 'boolean':
					case 'numID':
					case 'integer':
					case 'user':
					case 'status':
					case 'list':
					case 'foreignList':
						updateVal(this.fieldsValue, this.fieldsErr, tableHandle['view'][v], v, doc[v], tableHandle);
						break;
					case 'array':
						this.fieldsValue[v] = doc[v];
						break;
					default:
						return undefined;
				}

			}
		})
		//loop autocomplete and convert them for UI
		this.fields.filter((v)=> { return v.type==='autocomplete' }).forEach((v)=> {
			this.searchText[v.name] = this.fieldsValue[tableHandle['view'][v.name]['key']]
		})
		this.subTableFields.filter((v)=> { return v.type==='autocomplete' }).forEach((v)=> {
			this.searchText[v.name] = this.subTableFieldsValue[tableHandle['view'][v.name]['key']]
		})
		this.fields.filter((v)=> { return v.type==='foreignList' }).forEach((v)=> {
			this.searchText[v.name] = this.fieldsValue[v.name]
		})
		this.subTableFields.filter((v)=> { return v.type==='foreignList' }).forEach((v)=> {
			this.searchText[v.name] = this.subTableFieldsValue[v.name]
		})
		this.loadDocHandler.stop();
	}

	@action handleAddLine() { //add line for subtable
		if (Object.values(this.subTableFieldsErr).some((a) => {return a != ''})) { return }
		this.subTableLines.push(_.clone(this.subTableFieldsValue))
		const seqName = this.subTableFields[0].name.split('.')[0] + '.$.'+'sequence'
		this.subTableLines = this.subTableLines.slice().sort((a,b)=> { return a[seqName] - b[seqName] })
	}
	@action handleRemoveLine(i) { this.subTableLines.splice(i, 1) }
}
const store = new Store();

@observer export default class DocLoad1 extends Component {
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

	async componentWillMount() { //table wrong: alert; mode wrong: 404; id wrong: pop up
		store.setRolesAllowed(this.props.rolesAllowed)
		let a = await this.verifyUser(store.rolesAllowed);
		tableHandle = tableHandles(this.props.table);

		if (tableHandle === undefined) {
			//browserHistory.goBack()
			this.props.setCommonDialogMsg('錯誤: 數據庫 '+ this.props.table + ' 不存在.');
			this.props.setShowCommonDialog(true);
		}
		//prep the whole form. will handle error mode by re-direct to /404
		store.changeDoc(this.props.table, this.props.mode, this.props.docId, this.props.includeFields, this.props.providedLookupList);
	}

	async componentWillReceiveProps(nextProps) {
		store.setRolesAllowed(nextProps.rolesAllowed)
		let a = await this.verifyUser(store.rolesAllowed);
		tableHandle = tableHandles(nextProps.table);

		if (tableHandle === undefined) {
			//browserHistory.goBack()
			this.props.setCommonDialogMsg('錯誤: 數據庫 '+ nextProps.table + ' 不存在.');
			this.props.setShowCommonDialog(true);
		}
		//prep the whole form. will handle error mode by re-direct to /404
		store.changeDoc(nextProps.table, nextProps.mode, nextProps.docId, nextProps.includeFields, nextprops.providedLookupList);
	}

	subTableRowRenderer({ index, isScrolling, key, style }) {
		/* row level code */
		let rowStyle = style;
		let rowClass = "datatable_row";
		const row = store.subTableLines[index];
		if ((index % 2) == 0) { rowStyle = _.extend(rowStyle, tableStyle.evenRow) }

		return (
			<div className={rowClass} key={key} style={rowStyle}>
				{store.subTableFields.map((v) => {
					if (v.type == 'autocomplete') {
						let replaceField = tableHandle['view'][v.name]['key'];
						return subTableCellRenderer(false, row[replaceField] , tableHandle['view'][replaceField], replaceField+index)
					}
					else {
						return subTableCellRenderer(false, row[v.name], tableHandle['view'][v.name], v.name+'-'+index)
					}
				})}
				<FontIcon className="fa fa-trash" style={{height: '24px'}} onTouchTap={() => store.handleRemoveLine(index)}/>
			</div>
		)
	}

	async handleSubmit(e) {
		e.preventDefault();
		store.submitting(true);
		console.log('handleSubmit-1');
		const authResult = await this.verifyUser();
		console.log('handleSubmit-2');
		//only check field error, ignore subTable, coz subTable input is only for adding lines.
		if (Object.keys(store.fieldsErr).every((v) => store.fieldsErr[v]==='')) { }
		else {
			this.props.setCommonDialogMsg('錯誤: 表格內有需要更正的錯誤.');
			this.props.setShowCommonDialog(true);
			return;
		}
		const fieldsValue = Object.assign({},store.fieldsValue)
		const subTableValue = store.subTableLines.toJS()
		console.log('handleSubmit-3');
		//1. convert date from moment to Date()
		store.fields.forEach((v)=>{
			if ((v.type=='date')||(v.type=='datetime')) { fieldsValue[v.name] = fieldsValue[v.name].toDate() }
		})
		store.subTableFields.forEach((v)=>{
			if ((v.type=='date')||(v.type=='datetime')) {
				subTableValue.forEach((w) => { w[v.name] = w[v.name].toDate() })
			}
		})
		//2. update all 'url's, upload to S3 and get URL, save to object
		//http = not updating existing file.  string/undefined = not picking a file, object = picked a file
		for (let v of store.fields.toJS()) {
			if (v.type=='url'){
				try {
					if (typeof fieldsValue[v.name] === undefined) { }
					else if (typeof fieldsValue[v.name] === 'string') {
						if (fieldsValue[v.name].startsWith('http')) { }
						else {
							this.props.setCommonDialogMsg('錯誤: 未有正確檔案.  檔案需為JPG, PNG, GIF 或 PDF.');
							this.props.setShowCommonDialog(true);
							return;
						}
					}
					else {
						let u = await this.uploadPic(fieldsValue[v.name], store.table+'_'+v.name);
						updateVal(fieldsValue, store.fieldsErr, 'text', v.name, u, tableHandle);
					}
				} catch(err) {console.log(err)}
			}
		}
		for (v of store.subTableFields.toJS()) {
			if (v.type=='url'){
				for (w of subTableValue) {
					try {
						if (typeof w[v.name]=== 'undefined') {}
						else if (typeof w[v.name] === 'string') {
							if (w[v.name].startsWith('http')) { }
							else {
								this.props.setCommonDialogMsg('錯誤: 未有正確檔案.  檔案需為JPG, PNG, GIF 或 PDF.');
								this.props.setShowCommonDialog(true);
								return;
							}
						}
						//if it's not string then it's file object, i.e. local file is selected
						else {
							let u = await this.uploadPic(w[v.name], store.table+'_'+v.name);
							updateVal(w, store.subTableFieldsErr, 'text', v.name, u, tableHandle);
						}
					} catch(err) {console.log(err)}
				}
			}
		}
		//convert subTable keys + insert into newDoc
		console.log('handleSubmit.fieldsValue', fieldsValue)
		let newDoc = Object.assign({}, fieldsValue);
		if (subTableValue.length > 0) {
			console.log('subTableValue.length', subTableValue.length)
			let subTableName = store.subTableFields[0]['name']
			subTableName = subTableName.substring(0,subTableName.indexOf('.'))

			const subTable = []
			let line = {};
			for (v of subTableValue) {
				let keyName = Object.keys(v)
				keyName.forEach((n) => { line[n.substring(n.lastIndexOf('.')+1, n.length)] = v[n] })
				subTable.push(line);
				line = {};
			}
			newDoc[subTableName] = subTable;
		}
		try {
			let a = '';
			if (store.mode=='new') { a = await tableHandle['new'].callPromise(newDoc) }
			if (store.mode=='edit') {
				const docId = newDoc['_id'] //put _id as filter, and do not set it as update args
				newDoc['_id'] = undefined
				console.log('handleSubmit.edit', docId, newDoc)
				a = await tableHandle['update'].callPromise({filter: {'_id': docId }, args: newDoc})
			}
			this.props.setSnackBarMsg('Save successful, return msg: '+ a);
			this.props.setSnackBarAction({}, '');
			this.props.setShowSnackBar(true);
			store.submitting(false);
		} catch(err) {
			this.props.setCommonDialogMsg(err.toString());
			this.props.setShowCommonDialog(true);
			store.submitting(false);
		}
	}

	render() {
		let headerText = _.upperCase(store.mode + ' 1 ' + store.table);
		console.log(store.rowWidth, store.rowHeight);
		if (store.mode=='error') {
			this.props.setCommonDialogMsg("請求錯誤");
			this.props.setShowCommonDialog(true);
		}
		return (

			<div className="row-left">
				<div className="row-left">
					<h3>Main fields</h3>
				</div>
				<div className="widget widget-1col">
					{store.fields.map((v) => fieldRenderer(v, store.fieldsValue, store.fieldsErr, tableHandle, store.mode, store.searchText, store.lookupList))}
				</div>
				{/*subtable start */}
				{(store.subTableFields.length != 0) && (
					<div className="row-left">
						<div className="row-left">
							<h3>Sub table</h3>
						</div>
						{(store.mode!='view') && (
							<div className="row-left">
								<div className="widget widget-1col"> {/*create fields in subTable*/}
									{store.subTableFields.map((v) => fieldRenderer(v, store.subTableFieldsValue, store.subTableFieldsErr, tableHandle, store.mode, store.searchText, store.lookupList))}
								</div>
								<div className="row-left">
									<RaisedButton label="新增" primary={true} icon={<FontIcon className="fa fa-plus" />} onTouchTap={() => store.handleAddLine()} />
								</div>
							</div>
						)}
						<div className="widget table-container widget-1col">
							<Measure bounds onResize={(contentRect) => {
								store.setRowDimensions(contentRect.bounds.width, contentRect.bounds.height)
							}}>
								{({ measureRef }) => (
									<div ref={measureRef} className="datatable_headerRow"> {/*subTable lines header*/}
										{store.subTableFields.map((v) => {
											if (v.type == 'autocomplete') {
												let replaceField = tableHandle['view'][v.name]['key'];
												return subTableCellRenderer(true, tableHandle['schema'][replaceField]['label'] , tableHandle['view'][replaceField], 'header_'+replaceField)
											}
											else {
												return subTableCellRenderer(true, tableHandle['schema'][v.name]['label'] , v.type, 'header_'+v.name)
											}
										})}
										<div key="header_icon" style={fieldStyle['icon']['header']}> </div>
									</div>
								)}
							</Measure>
						</div>
						<InfiniteLoader
							isRowLoaded={({index}) => !!store.subTableLines[index]}
							loadMoreRows={(start, stop) => {}}
							rowCount={store.subTableLines.length}
							threshold={1}
						>
							{({ onRowsRendered, registerChild }) => (
								<List
									onRowsRendered={onRowsRendered}
									noRowsRenderer={() => { <div>沒有相關記錄</div> }}
									ref={(registerChild) => dataTable = registerChild}
									width={store.rowWidth}
									height={Math.min(400, store.rowHeight*store.subTableLines.length)}
									rowCount={store.subTableLines.length}
									rowHeight={store.rowHeight}
									rowRenderer={({ index, isScrolling, key, style }) => this.subTableRowRenderer({ index, isScrolling, key, style }) }
								/>
							)}
						</InfiniteLoader>
					</div>
				)}
				{/*subtable end */}
				{(store.mode!='view') && <RaisedButton style={{marginTop: '60px'}} label="儲存" fullWidth={true} secondary={true} icon={<FontIcon className="fa fa-floppy-o" />} onTouchTap={(e) => this.handleSubmit(e)} disabled={store.formSubmitting}/>}
			</div>
		)

	}
}
