import React, { Component } from 'react';

import Chip from 'material-ui/Chip';
import Avatar from 'material-ui/Avatar';
import FontIcon from 'material-ui/FontIcon';

import { tableStyle } from '../theme/ThemeSelector.js';

export default class TableFilterSortChip extends Component {
	constructor(props) { super(props) }

	getFilterChips() {
		if (this.props.v == undefined) { return <div></div> }
		let value, opType, field;
		field = this.props.k;

		if (_.isObject(this.props.v)) {
			opType = Object.keys(this.props.v)[0]
			console.log('genFilterChip', _.isObject(this.props.v), this.props.v, opType)
			if (opType == '$gte') { value= ">="+this.props.v[opType] }
			else if (opType == '$lte') { value= "<="+this.props.v[opType] }
			else if (opType == '$regex') { value= "="+this.props.v[opType] }
			else { value = 'Error'}
		} else { value = "="+this.props.v }

		return <Chip key={field+"_filter"} backgroundColor={tableStyle.sortChip.chipBGColor} labelColor={tableStyle.sortChip.chipTextColor} onRequestDelete={() => {
			this.props.onDel(-1, 0, field);
		}} >
			<Avatar key={field+"_filter"} color={tableStyle.sortChip.avatarTextColor} backgroundColor={tableStyle.sortChip.avatarBGColor} icon={<FontIcon className="fa fa-filter" />}/>
			{this.props.fieldName + value}
		</Chip>
	}

	getSortChips() {
		let field;
		field = this.props.k;
		if (this.props.v == undefined) { return <div></div> }
		return <Chip key={field+"_sort"} backgroundColor={tableStyle.sortChip.chipBGColor} labelColor={tableStyle.sortChip.chipTextColor} onRequestDelete={() => this.props.onDel(undefined, this.props.k)}>
			<Avatar key={field+"_sort"} color={tableStyle.sortChip.avatarTextColor} backgroundColor={tableStyle.sortChip.avatarBGColor} icon={(this.props.v==1)? <FontIcon className="fa fa-sort-alpha-asc" /> : <FontIcon className="fa fa-sort-alpha-desc" /> }/>
			{this.props.fieldName}
		</Chip>
	}

	render() {
		let a = (this.props.type == 'sort') ? this.getSortChips() : this.getFilterChips()
		return a
	}
}
