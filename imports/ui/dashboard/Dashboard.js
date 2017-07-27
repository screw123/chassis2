import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import ReactDOM from 'react-dom';
import { browserHistory, Link } from 'react-router';

import { checkAuth } from '../../api/auth/CheckAuth.js'

export default class Dashboard extends Component {
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
		return (
			<div>Dashboard</div>
		)
	}
}
