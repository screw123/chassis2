//Basic React/Meteor/mobx import
import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import { Promise } from 'meteor/promise';
import { Session } from 'meteor/session'
import { browserHistory, Link } from 'react-router';
import { observer } from "mobx-react";
import mobx, { observable, useStrict, action, extendObservable } from 'mobx';
import { autorunX, observeX } from '../../api/tracker-mobx-autorun'
useStrict(true);
//Material-ui import
import {List, ListItem} from 'material-ui/List';
//Package ad-hoc function import
import moment from 'moment';
//Custom formatting/component import
import { tableStyle, fieldStyle, comStyle, buttonStyle} from '../theme/ThemeSelector.js';
import UserChip from '../component/UserChip.js';
//Custom function import
import { checkAuth } from '../../api/auth/CheckAuth.js';

import { tableHandles, tableList } from '../../api/DBSchema/DBTOC.js';

//Begin code
const today = moment();

class Store {
}

const store = new Store();

@observer export default class AdminTableList extends Component {
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
		const a = await this.verifyUser([{role: 'admin', group: 'SYSTEM'}]);
	}

	componentWillUnmount() {
	}

	render() {
		return (
			<div>
				<div className="row-left">
					<h1>CHASSIS 系統控制室</h1>
				</div>
				<div className="row-left">
					<h3>數據庫列表</h3>
					<List>
						{tableList.map((v) => {
							return <ListItem primaryText={v} onTouchTap={() => { browserHistory.push('/admin/TableLoad/'+v)}} key={v}/>
						})}
						<ListItem primaryText='Users' onTouchTap={() => { browserHistory.push('/admin/UserList/')}} key='Users' />
					</List>
				</div>
			</div>
		)
	}
}
