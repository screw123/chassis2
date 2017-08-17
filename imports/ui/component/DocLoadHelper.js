import { Meteor } from 'meteor/meteor';
import React, { Component } from 'react';
import { action } from 'mobx';
import moment from 'moment';
import accounting from 'accounting';

//Material-ui import
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import AutoComplete from 'material-ui/AutoComplete';
import FontIcon from 'material-ui/FontIcon';
import Menu from 'material-ui/Menu';
import Dialog from 'material-ui/Dialog';
import Checkbox from 'material-ui/Checkbox';
import DatePicker from 'material-ui/DatePicker';
import TimePicker from 'material-ui/TimePicker';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

import { fieldStyle, comStyle } from '../theme/ThemeSelector.js';

export const getDefaultValue = (v)  => {
	//autocomplete will always be undefined, all read/write are targeting the linked values
	switch(v) {
		case 'date':
		case 'datetime':
			return null;
		case 'url':
			return '上傳檔案';
		case 'sysID':
		case 'text':
		case 'longText':
		case 'user':
		case 'list':
			return '';
		case 'array':
			return [];
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

export const updateVal = action(function updateVal(fieldStore, errStore, fieldType, fieldName, v, tableHandle, arg1) { //arg1 only for datetime and array now.
	errStore[fieldName] = ''; //reset error, set again if input is detected to be wrong
	switch(fieldType) {
		case 'date': //store as moment
			fieldStore[fieldName] = moment(v);
			if (!fieldStore[fieldName].isValid()) {
				fieldStore[fieldName] = ''
				errStore[fieldName] = '日期錯誤'
			}
			break;
		case 'datetime': //store as moment
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
			console.log(Object.keys(v));
			if (v.type == 'application/pdf') {
				//if isPDF then put object into store
				fieldStore[fieldName] = v;
			} else if (v.type == 'image/png' || v.type == 'image/jpg' || v.type == 'image/jpeg' ) {
				//if isImage then resize then put object into store
				Resizer.resize(v, {width: 1600, height: 1600, cropSquare: false}, function(err, file) {
					if (err) { errStore[fieldName] = '檔案錯誤' }
					else { updateVal(fieldStore, errStore, 'text', fieldName, v, tableHandle) }
				});
			}
			else {
				//else add to err but leave store undefined
				errStore[fieldName] = '格式不符';
				fieldStore[fieldName] = undefined;
			}
			break;
		case 'text':
		case 'longText':
		case 'user':
		case 'list':
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
			else if (v === '') { fieldStore[fieldName] = 0}
			break;
		case 'boolean':
			fieldStore[fieldName] = v;
			break;
		case 'autocomplete': //autocomplete field itself has no value, instead store into it's key/value field
			fieldStore[tableHandle['view'][fieldName]['key']] = v[tableHandle['view'][fieldName]['link']['text']];
			fieldStore[tableHandle['view'][fieldName]['value']] = v[tableHandle['view'][fieldName]['link']['value']];
			break;
		case 'array': //arg1 = isAdd, true add field, false remove field
			if (arg1===true) { fieldStore[fieldName].push(v) }
			else { fieldStore[fieldName].splice(fieldStore[fieldName].findIndex((x)=> x==v), 1) }
			break;
		default:
			return undefined;
	}
})

export const fieldRenderer = (f, valStore, errStore, tableHandle, mode, searchText, lookupList) => {
	switch(f.type) {
		case 'date':
			return (
				<div className="default-textField">
					<DatePicker disabled={mode=='view'} key={f.name} className="default-textField" floatingLabelText={tableHandle.schema[f.name].label} autoOk={true} disabled={mode=='view'}
						value={(valStore[f.name]===null)? null : valStore[f.name].toDate()}
						onChange={(a, newDate) => updateVal(valStore, errStore, f.type, f.name, newDate, tableHandle)}
						errorText={errStore[f.name]}
						textFieldStyle={comStyle}
					/>
				</div>
			);
		case 'datetime':
			return (
				<div className="widget">
					<div key={f.name+'_date'} className="default-textField">
						<DatePicker disabled={mode=='view'} className="default-textField" floatingLabelText={tableHandle.schema[f.name].label} autoOk={true} disabled={mode=='view'}
							value={(valStore[f.name]===null)? null : valStore[f.name].toDate()}
							onChange={(a, newDate) => updateVal(valStore, errStore, f.type, f.name, newDate, tableHandle, 'date')}
							errorText={errStore[f.name]}
							textFieldStyle={comStyle}
						/>
					</div>
					<div key={f.name+'_time'} className="default-textField">
						<TimePicker disabled={mode=='view'} className="default-textField" format="24hr" floatingLabelText={tableHandle.schema[f.name].label} autoOk={true} disabled={mode=='view'}
							value={(valStore[f.name]===null)? null : valStore[f.name].toDate()}
							onChange={(a, newDate) => updateVal(valStore, errStore, f.type, f.name, newDate, tableHandle, 'time')}
							errorText={errStore[f.name]}
							textFieldStyle={comStyle}
						/>
					</div>
				</div>
			);
		case 'sysID':
		case 'text':
			return (
				<TextField disabled={mode=='view'} className="default-textField" name={f.name} hintText="請輸入文字" value={valStore[f.name]} floatingLabelText={tableHandle.schema[f.name].label} disabled={mode=='view'} onChange={(e) => updateVal(valStore, errStore, f.type, f.name, e.target.value, tableHandle)} errorText={errStore[f.name]} />
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
			if (mode=='view') {
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
						onChange={ (e) => { updateVal(valStore, errStore, f.type, f.name, e.target.files[0], tableHandle)}}
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
							onChange={ (e) => { updateVal(valStore, errStore, f.type, f.name, e.target.files[0], tableHandle)}}
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
				<TextField className="default-textField" name={f.name} hintText="請輸入文字, 可分行" value={valStore[f.name]} floatingLabelText={tableHandle.schema[f.name].label} disabled={mode=='view'}
					onChange={(e) => updateVal(valStore, errStore, f.type, f.name, e.target.value, tableHandle)} errorText={errStore[f.name]} multiLine={true} rows={1}
				/>
			);
		case 'user':
		case 'numID':
		case 'integer':
			return (
				<TextField className="default-textField" name={f.name} hintText="請輸入整數" value={valStore[f.name]} floatingLabelText={tableHandle.schema[f.name].label} disabled={mode=='view'} onChange={(e) => updateVal(valStore, errStore, f.type, f.name, e.target.value, tableHandle)} errorText={errStore[f.name]} />
			);
		case 'currency':
			return (
				<TextField className="default-textField" name={f.name} type="number" hintText="請輸入金額" value={valStore[f.name]} floatingLabelText={tableHandle.schema[f.name].label} disabled={mode=='view'} onChange={(e) => updateVal(valStore, errStore, f.type, f.name, e.target.value, tableHandle)} errorText={errStore[f.name]} />
			);
		case 'decimal':
			return (
				<TextField className="default-textField" name={f.name} type="number" hintText="請輸入數字" value={valStore[f.name]} floatingLabelText={tableHandle.schema[f.name].label} disabled={mode=='view'} onChange={(e) => updateVal(valStore, errStore, f.type, f.name, e.target.value, tableHandle)} errorText={errStore[f.name]} />
			);
		case 'status':
		case 'autocomplete':
			console.log('fieldRenderer', f, searchText, lookupList)
			return (
				<AutoComplete disabled={mode=='view'} className="default-textField" floatingLabelText={tableHandle.schema[tableHandle.view[f.name].key].label} name={f.name} filter={AutoComplete.fuzzyFilter} openOnFocus={true} maxSearchResults={5}
					style={comStyle} menuStyle={comStyle} listStyle={comStyle}
					value={valStore[f.name]}
					searchText={searchText[f.name]}
					dataSource={lookupList[f.name].toJS()}
					dataSourceConfig={{
						text: tableHandle.view[f.name].link.text,
						value:  tableHandle.view[f.name].link.value}}
					ref={"AutoComplete_"+f.name}
					onNewRequest={(v, i) => {
						if (i==-1) { }
						updateVal(valStore, errStore, f.type, f.name, v, tableHandle)
					}}
					errorText={errStore[f.name]}
				/>
			);
		case 'boolean':
			return (
				<Checkbox disabled={mode=='view'} name={f.name} label={tableHandle.schema[f.name].label} checked={valStore[f.name]} style={comStyle} onCheck={(e, isInputChecked) => updateVal(valStore, errStore, f.type, f.name, isInputChecked, tableHandle)}/>
			)
		case 'list':
			return (
				<SelectField className="default-textField" value={valStore[f.name]} onChange={(e, i, payload) => updateVal(valStore, errStore, f.type, f.name, payload, tableHandle)} name={f.name} floatingLabelText={tableHandle.schema[f.name].label} disabled={mode=='view'} errorText={errStore[f.name]} menuStyle={comStyle} listStyle={comStyle} maxHeight={200}>
					{tableHandle.schema[f.name].allowedValues.map((v)=> {
						return <MenuItem value={v} primaryText={v} />
					})}
				</SelectField>
			)
		case 'array':
			<TextField className="default-textField" name={f.name} type="number" hintText="請輸入金額" value={valStore[f.name].join(";")} floatingLabelText={tableHandle.schema[f.name].label} disabled={mode=='view'} onChange={(e) => updateVal(valStore, errStore, f.type, f.name, e.target.value.split(";"), tableHandle)} errorText={errStore[f.name]} />
		default:
			return 'Error: FIELDVIEW UNKNOWN'
	}
}

export const uploadPic = async (url, modName) => {
	return new Promise((resolve, reject) => {
		const uploader = new Slingshot.Upload("docUpload", {module: modName});
		uploader.send(url, function (error, downloadURL) {
			if (error) { return reject(uploader.xhr.response) }
			else { return resolve(downloadURL) }
		});
	});
}

export const subTableCellRenderer = (isHeader, value, fieldView, key) => {
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
			case 'list':
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
			case 'list':
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
			case 'array':
				return <div key={key} style={fieldStyle[fieldView][contentType]} > { value.join(";") } </div>;
			default:
				return 'Error: fieldView unknown';
		}
	}
}

export const fieldsToDBFilter = (list) => {
	let a = {}
	list.forEach((v) => {
		if (v.match(/(\.\$\.)/)===null) { a[v] = 1 }
		else {
			let b = v.split(".");
			a[b[0]+"."+b[2]] = 1;
		}
	});
	return a;
}
