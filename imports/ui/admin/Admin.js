import React, { Component } from 'react';
import { Meteor } from 'meteor/meteor';
import ReactDOM from 'react-dom';

import { observer } from "mobx-react";
import { observable, useStrict, action } from 'mobx';

useStrict(true);

const handle =Meteor.subscribe("userList");

class Store {
	@observable userList = {};

	@action updateUser() {
		userList = handle.fetch().map((u) => (
			{id: u._id}
		))
	}
}

const store = new Store();

export default class Admin extends Component {
	constructor(props) {
		super();
		store.updateUser();
	}

	renderUser() {
		return
	}

	render() {
		return (
			<div>admin</div>

		)
	}
}
