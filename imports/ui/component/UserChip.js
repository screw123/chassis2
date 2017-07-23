import React, { Component } from 'react';

import { UserStatus } from 'meteor/mizzao:user-status';

import Chip from 'material-ui/Chip';
import Avatar from 'material-ui/Avatar';

import * as colors from 'material-ui/styles/colors';

export default class UserChip extends Component {
	constructor(props) { super(props) }

	getLabelColor(s) {
		/* Todo: Check user is online and change chip color */
		if (s == 1) { return colors.lightGreen700 }
		else if (s == 2) { return colors.limeA200 }
		else {return colors.grey800}
	}

	getAvatarColor(s) {
		if (s == 1) { return colors.lightGreen900 }
		else if (s == 2) { return colors.limeA400 }
		else {return colors.grey600}
	}

	getWordColor(s) {
		if (s == 1) { return colors.white }
		else if (s == 2) { return colors.black }
		else {return colors.white}
	}

	getLabelWord() {
		const u = Meteor.users.findOne({_id:this.props.userId})
		return u.profile.lastName + ' ' + u.profile.firstName
	}

	render() {
		let status;
		if (Meteor.users.findOne({_id:this.props.userId}).status.idle) { status = 2 }
		else if (Meteor.users.findOne({_id:this.props.userId}).status.online) { status = 1 }
		else { status = 0}
		return (
			<Chip backgroundColor={this.getLabelColor(status)} style={this.props.style} labelColor={this.getWordColor(status)} labelStyle={{height: 24, lineHeight: '24px', fontSize: '12px', maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis'}}>
				<Avatar style={{fontSize: '80%', height: 24, width: 24}} size={10} color={this.getWordColor(status)} backgroundColor={this.getAvatarColor(status)}>
					a
				</Avatar>
				{this.getLabelWord(status)}
			</Chip>
		)
	}
}
