import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import ReactDOM from 'react-dom';
import { browserHistory, Link } from 'react-router';

import { checkAuth } from '../../api/auth/CheckAuth.js';

import DocList from '../component/DocList.js';

export default class ClaimTest extends Component {
	constructor(props) {
		super(props);
	}

	async verifyUser() {
		const roles = [];
		try { const a = await checkAuth(roles) }
		catch(err) {
			this.props.setCommonDialogMsg(err);
			this.props.setShowCommonDialog(true);
			browserHistory.push('/login');
			return;
		}
	}

	componentWillMount() {
		this.verifyUser();
	}

	render() {
		const a = 1;
		return (
			<DocList
				table='claims'
				query={'claims.ALL'}
				rolesAllowed={['system.admin']}
				includeFields={['docNum', 'userId', 'createAt']}
				initLimit={10}
				multiSelect={false}
				enableDownload={false}
				enableDownloadAll={false}
				enableNew={false}

			/>
		)
	}
}
