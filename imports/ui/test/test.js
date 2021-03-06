//Basic React/Meteor/mobx import
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session'
import { browserHistory, Link } from 'react-router';
import { observer } from "mobx-react";
import mobx, { observable, useStrict, action, computed } from 'mobx';
import { autorunX, observeX } from '../../api/tracker-mobx-autorun'
useStrict(true);
//Material-ui import
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
//Package ad-hoc function import
import { check } from 'meteor/check'
import FileSaver from 'file-saver';
//Custom Schema import
import Claims, { ClaimsView, newClaim } from '../../api/DBSchema/claims.js';
import Status from '../../api/DBSchema/status.js';

import { postNewJournal, postReverseJournal } from '../../api/acct_module/gl.js';

class Store {
	@observable msg = '';
	@action setMsg(m) { this.msg = m}
}
const store = new Store();

@observer export default class Test extends Component {
	constructor(props){ super(props) }

	async testF() {
		let d = {}
		for (i=1;i<1000;i++) {
			v = _.random(1,1000)
			d = {
				userId: (((i % 2) == 0)? 'dh2Pen4DK2HJxqfyB': 'AtsAHhzpMeNLXyY5Q'),
				userName: (((i % 2) == 0)? 'Ping Chiu': 'J'),
				claimDate: new Date(_.random(2010,2017), _.random(1,12),_.random(1,28)),
				project: 'EHeeQmSLiLDG6ezcc',
				projectCode: 'test233',
				business: '48ZqfQDfbQrxAbvhD',
				businessCode: 'test222',
				claimDesc: 'longText',
				totalClaimAmt: v,
				status: 100,
				statusDesc: '100 - 初建',
				doc: 'http://www.abc.com',
				content: [{
					sequence: 1,
					COAID: 'y5yKTvBKdT9uAoBSF',
					COACode: '1001',
					COAName: 'Dummy COA',
					amt: v,
					EXCurrency: 'HKD',
					EXRate: 1.00,
					EXAmt: v,
					Remarks: 'longText'
				}]
			};
			try {
				console.log("submitting", v)
				store.setMsg(v+' ');
				let docNum = await newClaim.callPromise(d);
				console.log("submitted", v)
				let a = () => { browserHistory.push('/claims/MyClaims')};
			} catch (err) {
				this.props.setSnackBarMsg('Error: ' + err.message);
				let a = () => { }
				this.props.setSnackBarAction(a, '');
				this.props.setShowSnackBar(true);
				return;
			 }
		}

	}

	async test_acct_post() {
		const a = await postNewJournal.callPromise({
			batchDesc: 'test111',
			journalDate: new Date(),
			userId: 'dh2Pen4DK2HJxqfyB',
			organization: 'Nice Car HK',
			projectId: 'EHeeQmSLiLDG6ezcc',
			businessId: 'YHS7PQLgz6HQTxSfd',
			journalType: 'GEN',
			fiscalYear: 2017,
			fiscalPeriod: 6,
			entries: [
				{
					COAId: 'y5yKTvBKdT9uAoBSF',
					journalDesc: 'haha another test',
					EXCurrency: 'CNY',
					EXRate: 5,
					EXAmt: 20,
					supportDoc: 'http://www.abc.com',
					relatedDocType: 'Claim',
					relatedDocId: 'dh2Pen4DK2HJxqfyB'
				},
				{
					COAId: 'y5yKTvBKdT9uAoBSF',
					journalDesc: 'haha another test2',
					EXCurrency: 'CNY',
					EXRate: 1,
					EXAmt: -100,
					supportDoc: 'http://www.abc.com',
					relatedDocType: 'Claim',
					relatedDocId: 'dh2Pen4DK2HJxqfyB'
				}
			]
		});
		console.log(a)
	}

	async test_acct_reverse() {
		const a = await postReverseJournal.callPromise({
			batchNo: 9
		});
		console.log(a)
	}

	render() {
		return (
			<div>
				<RaisedButton label="Run1" secondary={true} onTouchTap={() =>
					{
						this.test_acct_reverse();
					}}
				/>
				{store.msg}
			</div>
		)
	}
}
