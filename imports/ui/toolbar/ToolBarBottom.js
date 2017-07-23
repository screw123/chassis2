import React from 'react';

import {Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarTitle} from 'material-ui/Toolbar';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

export default class ToolbarBottom extends React.Component {
	constructor(props) {
		super(props);
	}

	render() { return (
		<MuiThemeProvider muiTheme={this.props.muiTheme}>
			<Toolbar>
				<ToolbarGroup firstChild={true}>
					<ToolbarTitle text="testing" />
				</ToolbarGroup>
			</Toolbar>
		</MuiThemeProvider>
	)}
};
