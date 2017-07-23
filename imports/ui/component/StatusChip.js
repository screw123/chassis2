import React, { Component } from 'react';

import Chip from 'material-ui/Chip';
import Avatar from 'material-ui/Avatar';

import * as colors from 'material-ui/styles/colors';

export default class StatusChip extends Component {
	constructor(props) { super(props) }

	getLabelColor(s) {
		switch(true) {
			case (s >= 100 && s < 200): /* init/edit */
				return colors.indigo700;
				break;
			case (s >= 200 && s < 300): /* confirmed */
				return colors.blue500;
				break;
			case (s >= 300 && s < 400): /* pending */
				return colors.teal700;
				break;
			case (s >= 400 && s < 500): /* approved/processing */
				return colors.limeA400;
				break;
			case (s >= 500 && s < 600): /* completed */
				return colors.green700;
				break;
			case (s >= 600 && s < 900): /* issue */
				return colors.deepOrange700;
				break;
			case (s >= 900 && s < 1000): /* cancelled */
				return colors.lightBlack;
				break;
			default:
				return colors.faintBlack;
		}
	}

	getAvatarColor(s) {
		switch(true) {
			case (s >= 100 && s < 200): /* init/edit */
				return colors.indigo900;
				break;
			case (s >= 200 && s < 300): /* confirmed */
				return colors.blue700;
				break;
			case (s >= 300 && s < 400): /* pending */
				return colors.teal900;
				break;
			case (s >= 400 && s < 500): /* approved/processing */
				return colors.limeA700;
				break;
			case (s >= 500 && s < 600): /* completed */
				return colors.green900;
				break;
			case (s >= 600 && s < 900): /* issue */
				return colors.deepOrange900;
				break;
			case (s >= 900 && s < 1000): /* cancelled */
				return colors.darkBlack;
				break;
			default:
				return colors.lightBlack;
		}
	}

	getWordColor(s) {
		switch(true) {
			case (s >= 100 && s < 200): /* init/edit */
				return colors.white;
				break;
			case (s >= 200 && s < 300): /* confirmed */
				return colors.white;
				break;
			case (s >= 300 && s < 400): /* pending */
				return colors.white;
				break;
			case (s >= 400 && s < 500): /* approved/processing */
				return colors.black;
				break;
			case (s >= 500 && s < 600): /* completed */
				return colors.white;
				break;
			case (s >= 600 && s < 900): /* issue */
				return colors.white;
				break;
			case (s >= 900 && s < 1000): /* cancelled */
				return colors.white;
				break;
			default:
				return colors.black;
		}
	}

	render() {

		return (
			<Chip backgroundColor={this.getLabelColor(this.props.status)} style={this.props.style} labelColor={this.getWordColor(this.props.status)} labelStyle={{height: 24, lineHeight: '24px'}}>
				<Avatar style={{fontSize: '80%', height: 24}} size={10} color={this.getWordColor(this.props.status)} backgroundColor={this.getAvatarColor(this.props.status)}>
					{this.props.status}
				</Avatar>
				{this.props.labelWord}
			</Chip>
		)
	}
}
