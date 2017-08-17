import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';

//Material-ui import
import FontIcon from 'material-ui/FontIcon';
import StatusChip from '../component/StatusChip.js';
import UserChip from '../component/UserChip.js';
import moment from 'moment';
import accounting from 'accounting';

import { tableStyle, fieldStyle, comStyle, buttonStyle} from '../theme/ThemeSelector.js';

export const cellRenderer = (isHeader, value, fieldView, key, field, funcTableMenu) => {
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
			case 'list':
				return <div key={key} style={fieldStyle[fieldView][contentType]} onTouchTap={(e) => {
					e.preventDefault();
					funcTableMenu(true, e.currentTarget, field);
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
			case 'list':
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
				return <div key={key} style={fieldStyle[fieldView][contentType]} > { value.toString() } </div>;
			default:
				return 'Error: fieldView unknown';
		}
	}
}

export const handleDownloadCSV = (data, filename) => {
	const csv = Papa.unparse(data);
	const b = new Blob([csv], { type: "text/plain;charset=utf-8;" });
  	FileSaver.saveAs(b, filename+".csv");
}
