import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import ReactDOM from 'react-dom';
import { browserHistory, Link } from 'react-router';

import FileSaver from 'file-saver';

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
				cardTitle='所有報銷'
				table='claims'
				query='claims.ALL'
				rolesAllowed={['system.admin']}
				includeFields={['docNum', 'userId', 'createAt']}
				initLimit={10}
				allowMultiSelect={false}
				allowDownload={true}
				allowDownloadAll={false}
				allowNewDoc={true}
				docLoadPath={''}

			/>
		)
	}
}
//fixme to connect docLoadPath to claims/DocList to finish the testing part
