//DocLoad1

//Basic React/Meteor/mobx import
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { browserHistory, Link } from 'react-router';
import { observer } from "mobx-react";

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
//Custom Schema/store/helper import
import { tableHandles } from '../../api/DBSchema/DBTOC.js';
import { updateVal, fieldRenderer, subTableCellRenderer, uploadPic } from './DocLoadHelper.js';
import DocLoad1_store from './DocLoad1_store.js'

//Begin code
let tableHandle;
let dataTable;
let store;

@observer export default class DocLoad1 extends Component {
	constructor(props) {
		super(props);

		tableHandle = tableHandles(this.props.table);

		if (tableHandle === undefined) {
			this.props.setCommonDialogMsg('錯誤: 數據庫 '+ this.props.table + ' 不存在.');
			this.props.setShowCommonDialog(true);
		}
		else {
			if (this.props.store) { store = this.props.store }
			else {
				store = new DocLoad1_store(tableHandle);
			}
			store.setRolesAllowed(this.props.rolesAllowed);
			store.changeDoc(this.props.table, this.props.mode, this.props.docId, this.props.includeFields, this.props.providedLookupList, tableHandle);
		}
	}

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
		let a = await this.verifyUser(this.props.rolesAllowed);
	}

	async componentWillReceiveProps(nextProps) {
		tableHandle = tableHandles(nextProps.table);
		if (tableHandle === undefined) {
			//browserHistory.goBack()
			this.props.setCommonDialogMsg('錯誤: 數據庫 '+ nextProps.table + ' 不存在.');
			this.props.setShowCommonDialog(true);
			store.changeDoc('', 'error', '', '', '');
		}
		else {
			if (this.props.rolesAllowed != nextProps.rolesAllowed) {
				let a = await this.verifyUser(nextProps.rolesAllowed);
				store.setRolesAllowed(nextProps.rolesAllowed);
			}
			if ((this.props.table != nextProps.table) || (this.props.mode != nextProps.mode) || (this.props.docId != nextProps.docId) || (this.props.includeFields != nextProps.includeFields) || (this.props.providedLookupList != nextProps.providedLookupList)) {
				console.log('this=',this.props.includeFields,'next=', nextProps.includeFields)
				store.changeDoc(nextProps.table, nextProps.mode, nextProps.docId, nextProps.includeFields, nextProps.providedLookupList, tableHandle)
			}
		}
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
					else {return subTableCellRenderer(false, row[v.name], tableHandle['view'][v.name], v.name+'-'+index)}
				})}
				<FontIcon className="fa fa-trash" style={{height: '24px'}} onTouchTap={() => store.handleRemoveLine(index)}/>
			</div>
		)
	}

	async handleSubmit(e) {
		e.preventDefault();
		store.submitting(true);
		const authResult = await this.verifyUser();
		//only check field error, ignore subTable, coz subTable input is only for adding lines.
		if (Object.keys(store.fieldsErr).every((v) => store.fieldsErr[v]==='')) { }
		else {
			this.props.setCommonDialogMsg('錯誤: 表格內有需要更正的錯誤.');
			this.props.setShowCommonDialog(true);
			return;
		}
		const fieldsValue = Object.assign({},store.fieldsValue)
		const subTableValue = store.subTableLines.toJS()
		//1. convert date from moment to Date()
		store.fields.forEach((v)=>{
			if ((v.type=='date')||(v.type=='datetime')) {
				if ((fieldsValue[v.name]===undefined)||(fieldsValue[v.name]===null)) {
					fieldsValue[v.name] = undefined
				}
				else { fieldsValue[v.name] = fieldsValue[v.name].toDate() }
			}
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
						let u = await uploadPic(fieldsValue[v.name], store.table+'_'+v.name);
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
		console.log(this.props.customFields)
		let headerText = _.upperCase(store.mode + store.table);
		console.log(store.rowWidth, store.rowHeight);
		if (store.mode=='error') {
			this.props.setCommonDialogMsg("請求錯誤");
			this.props.setShowCommonDialog(true);
			return '';
		}
		return (

			<div className="row-left">
				<div className="row-left">
					<h3>Main fields</h3>
				</div>
				<div className="widget widget-1col">
					{store.fields.map((v) => {
						if (this.props.customFields[v.name]===undefined) {
							return fieldRenderer(v, store.fieldsValue, store.fieldsErr, tableHandle, store.mode, store.searchText, store.lookupList)
						}
						else {
							return this.props.customFields[v.name];
						}

					})}
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
									{store.subTableFields.map((v) => {
										//fixme insert code here to check if props provide alternative components of "v"
										return fieldRenderer(v, store.subTableFieldsValue, store.subTableFieldsErr, tableHandle, store.mode, store.searchText, store.lookupList)
									})}
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
