import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { observer } from "mobx-react";
import mobx, { observable, useStrict, action, computed } from 'mobx';
import { check } from 'meteor/check'

import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';
import Dialog from 'material-ui/Dialog';

import { fieldStyle, comStyle, buttonStyle} from '../theme/ThemeSelector.js';

class Store {
	@observable title = '';
	@observable fieldType = '';
	@observable currentItem = '';
	@observable show= false;
	@observable opType = 3;
	@observable input = '';
	@observable inputError = '';
	@action resetInputError() { this.inputError = '' }
	@action setCurrentItem(i) { this.currentItem = i }
	@action setOpType(i) { this.opType = i }
	@action setInput(i) { this.input = i }
	@action getHintText(type) {
		switch(type) {
			case 'sysID':
			case 'text':
			case 'longText':
			case 'user':
				return '輸入字串, 如: abc'
			case 'date':
			case 'datetime':
				return '輸入日期, 如: 2017-05-18'
			case 'status':
			case 'currency':
			case 'integer':
			case 'decimal':
			case 'numID':
				return '輸入數字'
			case 'url':
			case 'icon':
			default:
				return 'Error';
		}
	}
	@action checkFormAndConvert(type) {
		let isCorrect = true;
		try {
			switch(type) {
				case 'sysID':
				case 'text':
				case 'longText':
				case 'user':
					check(this.input, String);
					break;
				case 'date':
				case 'datetime':
					isCorrect = moment(this.input, "YYYY-MM-DD").isValid();
					if (isCorrect) { this.input = moment(this.input, "YYYY-MM-DD").toDate() }
				case 'status':
				case 'currency':
				case 'integer':
				case 'decimal':
				case 'numID':
					check(parseFloat(this.input, 10), Number);
					this.input = parseFloat(this.input, 10);
					break;
				case 'url':
				case 'icon':
				default:
					isCorrect = false;
			}
		}
		catch(e) {
			this.inputError = '輸入錯誤, 請修改';
			return;
		}
		if (!isCorrect || this.input == '') {
			this.inputError = '輸入錯誤, 請修改';
			return;
		}
	}
	@action setTitle(a) { this.title = a }
	@action setFieldType(a) { this.fieldType = a }
}
const store = new Store();

@observer export default class FilterDialog extends Component {
	constructor(props) {
		super(props);
		store.setTitle(props.title);
		store.setFieldType(props.fieldType);
		store.setCurrentItem(props.currentItem);
		this.setCloseDialog = props.showController.bind(this);
		this.onSubmit = props.onSubmit.bind(this);
	}

	componentWillReceiveProps(nextProps) {
		store.setTitle(nextProps.title);
		store.setFieldType(nextProps.fieldType);
		store.setCurrentItem(nextProps.currentItem);
		this.setCloseDialog = nextProps.showController.bind(this);
		this.onSubmit = nextProps.onSubmit.bind(this);
	}


	getFilterOptions(type) {
		// 1: gte; 2: lte, 3: eq, 4: like
		let one, two, three, four = false;
		switch(type) {
			case 'sysID':
			case 'text':
			case 'longText':
			case 'user':
				three = true;
				four = true;
				break;
			case 'numID':
			case 'date':
			case 'datetime':
			case 'currency':
			case 'integer':
			case 'decimal':
			case 'status':
				one = true;
				two = true;
				three = true;
				break;
			case 'url':
			case 'icon':
			default:
		}
		return <DropDownMenu className="default-textField" value={store.opType} onChange={(e,i,v) => store.setOpType(v)} style={comStyle} underlineStyle={Object.assign({margin: '0px'},comStyle)} labelStyle={{paddingLeft: '0px'}} iconStyle={{right: '0px'}}>
			{one && <MenuItem value={1} primaryText="大於或等於"/>}
			{two && <MenuItem value={2} primaryText="小於或等於"/>}
			{three && <MenuItem value={3} primaryText="等於"/>}
			{four && <MenuItem value={4} primaryText="含有"/>}
		</DropDownMenu>
	}

	render() {
		return (
			<Dialog
				title={store.title}
				style={{width: '100%', maxWidth: 'none',}}
				actions={[
					<RaisedButton label="OK" className="button" primary={true} style={buttonStyle} onTouchTap={() => {
						store.checkFormAndConvert(store.fieldType);
						if (store.inputError == '') {
							this.setCloseDialog();
							this.onSubmit(store.opType, store.input, store.currentItem);
							store.setInput('');
						}
					}} />,
					<RaisedButton label="取消" className="button" primary={true} style={buttonStyle} onTouchTap={() => {
						this.setCloseDialog();
						store.resetInputError();
					}} />
				]}
				modal={false}
				open={this.props.show}
				onRequestClose={() => {
					this.setCloseDialog();
					store.resetInputError();
				}}
			>
				<div className="widget widget-default">
					{this.getFilterOptions(store.fieldType)}
					<TextField className="default-textField" hintText={store.getHintText(store.fieldType)} value={store.input} onChange={(e) => store.setInput(e.target.value)} errorText={store.inputError}/>
				</div>
			</Dialog>
		)
	}

}
