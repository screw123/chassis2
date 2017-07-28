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
import AutoComplete from 'material-ui/AutoComplete';
import FontIcon from 'material-ui/FontIcon';
import IconButton from 'material-ui/IconButton';
import IconMenu from 'material-ui/IconMenu';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
import Popover  from 'material-ui/Popover';
import Paper from 'material-ui/Paper';
import Dialog from 'material-ui/Dialog';
import Checkbox from 'material-ui/Checkbox';
import DatePicker from 'material-ui/DatePicker';
import TimePicker from 'material-ui/TimePicker';
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

	@action submitting(b) {this.formSubmitting = b}

	@action setRowDimensions(w,h) {
		this.rowWidth=w;
		this.rowHeight=h;
	 }

	@action changeDoc(t, m, d) { //t=table name, m=mode, d = docID
		this.table = t;
		this.mode = m;

		//Create view
		let subTableFields = [];
		let fields = [];
		let lookupList = {};
		let searchText = {};
		Object.keys(tableHandle['view']).forEach((v) => {
			if (v.includes('.$.')) { //subtable
				if (_.isPlainObject(tableHandle['view'][v])) {
					subTableFields.push({name: v, type: 'autocomplete'})
					subTableFields.splice(subTableFields.findIndex((x) => {return x == v['key']}) - 1, 1)
					subTableFields.splice(subTableFields.findIndex((x) => {return x == v['value']}) - 1, 1)
					lookupList[v] = [];
					searchText[v] = '';
					Meteor.call(tableHandle['view'][v]['link']['q'], (error, result) => {
						if (error) { console.log(error) }
						else {this.updateLookupList(v, result) }
					})
				}
				else { subTableFields.push({name: v, type: tableHandle['view'][v]}) }
			}
			else {
				if (_.isPlainObject(tableHandle['view'][v])) {
					fields.push({name: v, type: 'autocomplete'})
					fields.splice(fields.findIndex((x) => {return x == v['key']}) - 1, 1)
					fields.splice(fields.findIndex((x) => {return x == v['value']}) - 1, 1)
					lookupList[v] = [];
					searchText[v] = '';
					Meteor.call(tableHandle['view'][v]['link']['q'], (error, result) => {
						if (error) { console.log(error) }
						else {this.updateLookupList(v, result)}
					})
				}
				else { fields.push({name: v, type: tableHandle['view'][v]}) }
			}
		});
		this.fields = fields;
		this.subTableFields = subTableFields;
		this.initForm();
		this.lookupList = lookupList;
		this.searchText = searchText;

		switch(m) {
			case 'new':
				break;
			case 'edit':
				this.loadDocHandler = Meteor.subscribe(tableHandle['singleDoc'], d, {
					onReady: () => { this.loadForm(d) },
					onStop: (e) => { console.log(e) }
				});
				break;
			case 'view':
				this.mode = 'view';
				this.loadDocHandler = Meteor.subscribe(tableHandle['singleDoc'], d, {
					onReady: () => this.loadForm(d),
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

	@action initForm() {
		let fieldsValue = {};
		let fieldsErr = {};
		let subTableFieldsValue = {};
		let subTableFieldsErr = {};
		this.fields.forEach((v) => {
			fieldsValue[v.name] = this.getDefaultValue(v.type);
			fieldsErr[v.name] = '';
		});
		this.subTableFields.forEach((v) => {
			subTableFieldsValue[v.name] = this.getDefaultValue(v.type);
			subTableFieldsErr[v.name] = '';
		});
		this.fieldsValue = fieldsValue;
		this.fieldsErr = fieldsErr;
		this.subTableFieldsValue = subTableFieldsValue;
		this.subTableFieldsErr = subTableFieldsErr;
	}

	@action getDefaultValue(v) { //autocomplete will always be undefined, all read/write are targeting the linked values
		switch(v) {
			case 'date':
			case 'datetime':
				return moment();
			case 'url':
				return '上傳檔案';
			case 'sysID':
			case 'text':
			case 'longText':
			case 'user':
				return '';
			case 'numID':
			case 'currency':
			case 'integer':
			case 'decimal':
			case 'status':
				return 0;
			case 'boolean':
				return false;
			default:
				return undefined;
		}
	}

	@action loadForm(d) {
		const doc = tableHandle['main'].findOne({_id: d});
		if (doc == undefined) {
			this.mode = 'error';
			return;
		}

		Object.keys(doc).forEach((v)=> {
			//object can be date or subTable
			if (doc[v] instanceof Date) {
				store.updateVal(this.fieldsValue, this.fieldsErr, tableHandle['view'][v], v, doc[v])
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
						store.updateVal(this.fieldsValue, this.fieldsErr, tableHandle['view'][v], v, doc[v]);
						break;
					default:
						return undefined;
				}
				//loop autocomplete and convert them for UI
			}
		})
		this.fields.filter((v)=> { return v.type==='autocomplete' }).forEach((v)=> {
			this.searchText[v.name] = this.fieldsValue[tableHandle['view'][v.name]['key']]
		})
		this.loadDocHandler.stop();
	}

	@action updateVal(fieldStore, errStore, fieldType, fieldName, v, arg1) { //arg1 only for datetime now. isUpdate for edit form, not for new/view
		errStore[fieldName] = '';
		switch(fieldType) {
			case 'date':
				fieldStore[fieldName] = moment(v);
				if (!fieldStore[fieldName].isValid()) {
					fieldStore[fieldName] = ''
					errStore[fieldName] = '日期錯誤'
				}
				break;
			case 'datetime':
				const a = moment(v);
				if (arg1==='date') { fieldStore[fieldName] = moment({year: a.year(), month: a.month(), date: a.date(), hour: fieldStore[fieldName].hour(), minute: fieldStore[fieldName].minute(), second: fieldStore[fieldName].second()}) }
				else fieldStore[fieldName] = moment(v);
				if (!fieldStore[fieldName].isValid()) {
					fieldStore[fieldName] = ''
					errStore[fieldName] = '日期錯誤'
				}
				break;
			case 'sysID':
				break; //does not allow change of sysID
			case 'url':
				const self=this
				console.log(Object.keys(v));
				if (v.type == 'application/pdf') {
					fieldStore[fieldName] = v; //if isPDF then put object into store
				} else if (v.type == 'image/png' || v.type == 'image/jpg' || v.type == 'image/jpeg' ) {
					Resizer.resize(v, {width: 1600, height: 1600, cropSquare: false}, function(err, file) {
						if (err) { errStore[fieldName] = '檔案錯誤' }
						else { self.updateVal(fieldStore, errStore, 'text', fieldName, v) } //if isImage then resize then put object into store
					});
				}
				else {
					errStore[fieldName] = '格式不符';
					fieldStore[fieldName] = undefined;
				} //else add to err but leave store undefined
				break;
			case 'text':
			case 'longText':
			case 'user':
				fieldStore[fieldName] = v;
				break;
			case 'numID':
			case 'integer':
			case 'status':
				if (v == parseInt(v,10)) { fieldStore[fieldName] = parseInt(v, 10) }
				else if (v === '') { fieldStore[fieldName] = 0}
				break;
			case 'decimal':
			case 'currency':
				if (v == parseFloat(v)) { fieldStore[fieldName] = parseFloat(v) }
				else if (v === '') { fieldStore[fieldName] = 0} //fixme find a way to fix the input decimal point issue
				break;
			case 'boolean':
				fieldStore[fieldName] = v;
				break;
			case 'autocomplete':
				fieldStore[tableHandle['view'][fieldName]['key']] = v[tableHandle['view'][fieldName]['link']['text']];
				fieldStore[tableHandle['view'][fieldName]['value']] = v[tableHandle['view'][fieldName]['link']['value']];
				break;
			default:
				return undefined;
		}
	}

	@action handleAddLine() {
		if (Object.values(this.subTableFieldsErr).some((a) => {return a != ''})) { return }
		this.subTableLines.push(_.clone(this.subTableFieldsValue))
		const seqName = this.subTableFields[0].name.split('.')[0] + '.$.'+'sequence'
		this.subTableLines = this.subTableLines.slice().sort((a,b)=> { return a[seqName] - b[seqName] })
	}
	@action handleRemoveLine(i) {
		this.subTableLines.splice(i, 1);
	}

}
const store = new Store();

@observer export default class AdminDocLoad extends Component {
	constructor(props) { super(props) } //ok

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

	async componentWillMount() { //table wrong: alert; mode wrong: 404; id wrong: pop up
		tableHandle = tableHandles(this.props.params.tableName);
		if (tableHandle === undefined) {
			//browserHistory.goBack()
			this.props.setCommonDialogMsg('錯誤: 數據庫 '+ this.props.params.tableName + ' 不存在.');
			this.props.setShowCommonDialog(true);
		}
		store.changeDoc(this.props.params.tableName, this.props.params.mode, this.props.params.id); //prep the whole form. will handle error mode by re-direct to /404
		const a = await this.setMode(); //to load doc content into store if it's edit/view
	}

	async componentWillReceiveProps(nextProps) {
		tableHandle = tableHandles(nextProps.params.tableName);
		if (tableHandle === undefined) {
			//browserHistory.goBack()
			nextProps.setCommonDialogMsg('錯誤: 數據庫 '+ nextProps.params.tableName + ' 不存在.');
			nextProps.setShowCommonDialog(true);
		}
		store.changeDoc(nextProps.params.tableName, nextProps.params.mode, nextProps.params.id); //prep the whole form. will handle error mode by re-direct to /404
		const a = await this.setMode(); //to load doc content into store if it's edit/view
	}

	async setMode() {
		const a = await this.verifyUser(store.rolesAllowed);
	}

	fieldRenderer(f, valStore, errStore) {
		switch(f.type) {
			case 'date':
				return (
					<div className="default-textField">
						<DatePicker disabled={store.mode=='view'} key={f.name} className="default-textField" floatingLabelText={tableHandle.schema[f.name].label} autoOk={true} disabled={store.mode=='view'}
							value={valStore[f.name].toDate()}
							onChange={(a, newDate) => store.updateVal(valStore, errStore, f.type, f.name, newDate)}
							errorText={errStore[f.name]}
							textFieldStyle={comStyle}
						/>
					</div>
				);
			case 'datetime':
				return (
					<div className="widget">
						<div key={f.name+'_date'} className="default-textField">
							<DatePicker disabled={store.mode=='view'} className="default-textField" floatingLabelText={tableHandle.schema[f.name].label} autoOk={true} disabled={store.mode=='view'}
								value={valStore[f.name].toDate()}
								onChange={(a, newDate) => store.updateVal(valStore, errStore, f.type, f.name, newDate, 'date')}
								errorText={errStore[f.name]}
								textFieldStyle={comStyle}
							/>
						</div>
						<div key={f.name+'_time'} className="default-textField">
							<TimePicker disabled={store.mode=='view'} className="default-textField" format="24hr" floatingLabelText={tableHandle.schema[f.name].label} autoOk={true} disabled={store.mode=='view'}
								value={valStore[f.name].toDate()}
								onChange={(a, newDate) => store.updateVal(valStore, errStore, f.type, f.name, newDate, 'time')}
								errorText={errStore[f.name]}
								textFieldStyle={comStyle}
							/>
						</div>
					</div>
				);
			case 'sysID':
			case 'text':
				return (
					<TextField disabled={store.mode=='view'} className="default-textField" name={f.name} hintText="請輸入文字" value={valStore[f.name]} floatingLabelText={tableHandle.schema[f.name].label} disabled={store.mode=='view'} onChange={(e) => store.updateVal(valStore, errStore, f.type, f.name, e.target.value)} errorText={errStore[f.name]} />
				);
			case 'url':
				if (_.isObject(valStore[f.name])) { //File/blob, i.e. user just selected it from local.  In this case we only use url not a
					a = valStore[f.name].name
					url =  URL.createObjectURL(valStore[f.name])
				}
				else { //else it's a string with URL stored
					a = valStore[f.name].split('/').pop()
					url = valStore[f.name]
				}
				const filename = (a.length > 10)? (a.substring(0,9) + "..."): (a)
				if (store.mode=='view') {
					return (
						<RaisedButton name={f.name} style={comStyle} labelColor={'#ff0000'} icon={<FontIcon className="fa fa-search" style={{height: '24px'}} key={f.name+'_view'}/>} label={filename} primary={true}
							onTouchTap={(e) => window.open(url, "_blank", "location=0,menubar=0,toolbar=0,")}
						/>
					)
				}
				if ((a=='上傳檔案') || (errStore[f.name].length > 0)) { //if not a file or have error, do not show view button
					return (
						<RaisedButton containerElement='label' name={f.name} style={comStyle} labelColor={'#ff0000'} icon={<FontIcon className="fa fa-cloud-upload" style={{height: '24px'}} key={f.name+'_upload'}/>}
							label={ (errStore[f.name] == '')? (filename): (errStore[f.name]) }
							primary={(errStore[f.name] == '')}
							onChange={ (e) => { store.updateVal(valStore, errStore, f.type, f.name, e.target.files[0])}}
						>
							<input type="file" className="inputfile" />
						</RaisedButton>
					)
				}
				else {
					return (
						<div className="widget">
							<RaisedButton containerElement='label' name={f.name} style={comStyle} labelColor={'#ff0000'} icon={<FontIcon className="fa fa-cloud-upload" style={{height: '24px'}} key={f.name+'_upload'}/>}
								label={ (errStore[f.name] == '')? (filename): (errStore[f.name]) }
								primary={(errStore[f.name] == '')}
								onChange={ (e) => { store.updateVal(valStore, errStore, f.type, f.name, e.target.files[0])}}
							>
								<input type="file" className="inputfile" />
							</RaisedButton>
							<RaisedButton name={f.name} style={comStyle} labelColor={'#ff0000'} icon={<FontIcon className="fa fa-search" style={{height: '24px'}} key={f.name+'_view'}/>} label='查看檔案' primary={true}
								onTouchTap={(e) => window.open(url, "_blank", "location=0,menubar=0,toolbar=0,")}
							/>
						</div>
					)
				}

			case 'longText':
				return (
					<TextField className="default-textField" name={f.name} hintText="請輸入文字, 可分行" value={valStore[f.name]} floatingLabelText={tableHandle.schema[f.name].label} disabled={store.mode=='view'}
						onChange={(e) => store.updateVal(valStore, errStore, f.type, f.name, e.target.value)} errorText={errStore[f.name]} multiLine={true} rows={1}
					/>
				);
			case 'user':
			case 'numID':
			case 'integer':
				return (
					<TextField className="default-textField" name={f.name} hintText="請輸入整數" value={valStore[f.name]} floatingLabelText={tableHandle.schema[f.name].label} disabled={store.mode=='view'} onChange={(e) => store.updateVal(valStore, errStore, f.type, f.name, e.target.value)} errorText={errStore[f.name]} />
				);
			case 'currency':
				return (
					<TextField className="default-textField" name={f.name} type="number" hintText="請輸入金額" value={valStore[f.name]} floatingLabelText={tableHandle.schema[f.name].label} disabled={store.mode=='view'} onChange={(e) => store.updateVal(valStore, errStore, f.type, f.name, e.target.value)} errorText={errStore[f.name]} />
				);
			case 'decimal':
				return (
					<TextField className="default-textField" name={f.name} type="number" hintText="請輸入數字" value={valStore[f.name]} floatingLabelText={tableHandle.schema[f.name].label} disabled={store.mode=='view'} onChange={(e) => store.updateVal(valStore, errStore, f.type, f.name, e.target.value)} errorText={errStore[f.name]} />
				);
			case 'status':
			case 'autocomplete':
				return (
					<AutoComplete disabled={store.mode=='view'} className="default-textField" floatingLabelText={tableHandle.schema[tableHandle.view[f.name].key].label} name={f.name} filter={AutoComplete.fuzzyFilter} openOnFocus={true} maxSearchResults={5}
						style={comStyle} menuStyle={comStyle} listStyle={comStyle}
						value={valStore[f.name]}
						searchText={store.searchText[f.name]}
						dataSource={store.lookupList[f.name].toJS()}
						dataSourceConfig={{
							text: tableHandle.view[f.name].link.text,
							value:  tableHandle.view[f.name].link.value}}
						ref={"AutoComplete_"+f.name}
						onNewRequest={(v, i) => {
							if (i==-1) { }
							store.updateVal(valStore, errStore, f.type, f.name, v)
						}}
						errorText={errStore[f.name]}
					/>
				);
			case 'boolean':
				return (
					<Checkbox disabled={store.mode=='view'} name={f.name} label={tableHandle.schema[f.name].label} checked={valStore[f.name]} style={comStyle} onCheck={(e, isInputChecked) => store.updateVal(valStore, errStore, f.type, f.name, isInputChecked)}/>
				)
			default:
				return 'Error: FIELDVIEW UNKNOWN'
		}
	}

	subTableCellRenderer(isHeader, value, fieldView, key) {
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
				case 'status':
				case 'user':
				case 'url':
				case 'boolean':
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
				case 'url':
					let v = ''
					if ((typeof value)==='Object') { v = value.name.substring(0,9) + "..." }
					return <div key={key} style={fieldStyle[fieldView][contentType]}> { v } </div>;
				default:
					return 'Error: fieldView unknown';
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
						return this.subTableCellRenderer(false, row[replaceField] , tableHandle['view'][replaceField], replaceField+index)
					}
					else {
						return this.subTableCellRenderer(false, row[v.name], tableHandle['view'][v.name], v.name+'-'+index)
					}
				})}
				<FontIcon className="fa fa-trash" style={{height: '24px'}} onTouchTap={() => store.handleRemoveLine(index)}/>
			</div>
		)
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
						store.updateVal(fieldsValue, store.fieldsErr, 'text', v.name, u);
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
							store.updateVal(w, store.subTableFieldsErr, 'text', v.name, u);
						}
					} catch(err) {console.log(err)}
				}
			}
		}
		//convert subTable keys + insert into newDoc
		let newDoc = Object.assign({}, fieldsValue);
		if (subTableValue.length > 0) {
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
				const docId = newDoc['_id']
				newDoc['_id'] = undefined
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
		let headerText = _.upperCase(store.mode + ' ' + store.table);
		console.log(store.rowWidth, store.rowHeight);
		if (store.mode=='error') {
			this.props.setCommonDialogMsg("請求錯誤");
			this.props.setShowCommonDialog(true);
		}
		return (

			<div className="row-left">
				<div className="row-left">
					<h1>{headerText}</h1>
					<h3>Main fields</h3>
				</div>
				<div className="widget widget-1col">
					{store.fields.map((v) => this.fieldRenderer(v, store.fieldsValue, store.fieldsErr))}
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
									{store.subTableFields.map((v) => this.fieldRenderer(v, store.subTableFieldsValue, store.subTableFieldsErr))}
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
												return this.subTableCellRenderer(true, tableHandle['schema'][replaceField]['label'] , tableHandle['view'][replaceField], 'header_'+replaceField)
											}
											else {
												return this.subTableCellRenderer(true, tableHandle['schema'][v.name]['label'] , v.type, 'header_'+v.name)
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
