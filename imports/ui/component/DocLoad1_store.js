import mobx, { observable, useStrict, action } from 'mobx';
useStrict(true);

import { Meteor } from 'meteor/meteor';
import moment from 'moment';

import { getDefaultValue, updateVal, fieldsToDBFilter } from './DocLoadHelper.js';

export default class DocLoad1_store {

	tableHandle = '';
	constructor(tH) { tableHandle = tH }

	@observable table = ''; //table name
	@observable mode = 'loading'; //view, edit or new

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

	@action changeDoc(t, m, d, includeFields, providedLookupList, newTableHandle) { //t=table name, m=mode, d = docID, includedFields = array of field name vs DBTOC['view']
		if (newTableHandle != undefined) { tableHandle = newTableHandle }
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

		for (v of fieldsToInclude) { //have to pre-build lookupList and searchText for mobX reactivity
			if (_.isPlainObject(tableHandle['view'][v])) {
				lookupList[v] = ['Loading...'];
				searchText[v] = '';
			}
		}
		this.lookupList = lookupList;
		this.searchText = searchText;

		//compile field list for both main table and subtable.  Only support single subtable in a document
		fieldsToInclude.forEach((v) => {
			if (v.includes('.$.')) { //subtable
				if (_.isPlainObject(tableHandle['view'][v])) { //=autocomplete
					let type = tableHandle['view'][v][type];
					subTableFields.push({name: v, type: 'autocomplete'})
					subTableFields.splice(subTableFields.findIndex((x) => {return x == v['key']}) - 1, 1)
					subTableFields.splice(subTableFields.findIndex((x) => {return x == v['value']}) - 1, 1)
					if (!(v in providedLookupList)) { //if lookupList not provided by parent, load default
						Meteor.call(tableHandle['view'][v]['link']['q'], (error, result) => {
							if (error) { console.log('store.changeDoc.createFieldList.subtable',error) }
							else {this.updateLookupList(v, result) }
						});
					}
				}
				else { subTableFields.push({name: v, type: tableHandle['view'][v]}) }
			}
			else { //maintable
				if (_.isPlainObject(tableHandle['view'][v])) { //=autocomplete
					fields.push({name: v, type: 'autocomplete'})
					fields.splice(fields.findIndex((x) => {return x == v['key']}) - 1, 1)
					fields.splice(fields.findIndex((x) => {return x == v['value']}) - 1, 1)
					if (!(v in providedLookupList)) { //if lookupList not provided by parent, load default
						Meteor.call(tableHandle['view'][v]['link']['q'], (error, result) => {
							if (error) { console.log('store.changeDoc.createFieldList.table',error) }
							else {
								this.updateLookupList(v, result)
							 }
						});
					}
				}
				else { fields.push({name: v, type: tableHandle['view'][v]}) }
			}
		});
		for (v in providedLookupList) { //load all provided list into store.lookupList
			this.updateLookupList(v, providedLookupList[v])
		}
		this.fields = fields;
		this.subTableFields = subTableFields;
		this.initForm();
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
