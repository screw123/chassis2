import * as colors from 'material-ui/styles/colors';
import {fade, darken} from 'material-ui/utils/colorManipulator';

const themeDayTime = {
	fontFamily: 'Roboto, Noto Sans TC, sans-serif',
	palette: {
		primary1Color: colors.cyan600,
		primary2Color: colors.lightBlue500,
		primary3Color: colors.indigo900,
		accent1Color: colors.deepOrange700,
		accent2Color: colors.lightBlue200,
		accent3Color: colors.deepOrange700,
		textColor: fade(colors.darkBlack, 0.8),
		secondaryTextColor: colors.white,
		alternateTextColor: fade(colors.darkBlack, 0.8),
		canvasColor: colors.yellow600,
		borderColor: colors.brown600,
		disabledColor: colors.brown600,
		pickerHeaderColor: colors.orange500,
		clockCircleColor: fade(colors.darkBlack, 0.07),
		shadowColor: colors.fullBlack,
	},
	appBar: {
		height: 56,
	},
	toolbar: {
		height: 48,
	},
	snackbar: {
      textColor: colors.white,
    }
};

export const currentTheme = themeDayTime;

export const comStyle = {
	width: '180px'
}

export const buttonStyle = {
	margin: '3px'
}

export const iconButtonStyle = {
	margin: '3px',
	width: '36px',
	minWidth: '36px'
}

export const tableStyle = {
	evenRow: {
		backgroundColor: darken(currentTheme.palette.canvasColor, 0.1)
	},
	sortChip: {
		chipBGColor: currentTheme.palette.accent1Color,
		chipTextColor: currentTheme.palette.secondaryTextColor,
		avatarTextColor: currentTheme.palette.secondaryTextColor,
		avatarBGColor: darken(currentTheme.palette.accent1Color, 0.2)
	}
}

export const fieldStyle = {
	sysID: {
		header: {flex: '0 1 150px', height: '24px', overflow: 'hidden'},
		content: {flex: '0 1 150px', height: '24px', overflow: 'hidden'}
	},
	numID: {
		header: {flex: '0 1 45px', height: '24px', overflow: 'hidden', textAlign: 'center', paddingRight: '5px'},
		content: {flex: '0 1 45px', height: '24px', overflow: 'hidden', textAlign: 'center', paddingRight: '5px'}
	},
	icon: {
		header: {flex: '0 1 27px', height: '24px', overflow: 'hidden'},
		content: {flex: '0 1 27px', height: '24px', overflow: 'hidden'}
	},
	muiIconElement: {width: 24, height: 24, padding: 0},
	date: {
		header: {flex: '0 1 100px', height: '24px', overflow: 'hidden'},
		content: {flex: '0 1 100px', height: '24px', overflow: 'hidden'}
	},
	datetime: {
		header: {flex: '0 1 130px', height: '24px', overflow: 'hidden'},
		content: {flex: '0 1 130px', height: '24px', overflow: 'hidden'}
	},
	text: {
		header: {flex: '0 1 100px', height: '24px', overflow: 'hidden'},
		content: {flex: '0 1 100px', height: '24px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}
	},
	longText: {
		header: {flex: '0 1 200px', height: '24px', overflow: 'hidden'},
		content: {flex: '0 1 200px', height: '24px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}
	},
	currency: {
		header: {flex: '0 1 100px', height: '24px', overflow: 'hidden', textAlign: 'center'},
		content: {flex: '0 1 100px', height: '24px', overflow: 'hidden', whiteSpace: 'pre', fontFamily:'Inconsolata, monospace'}
	},
	integer: {
		header: {flex: '0 1 50px', height: '24px', overflow: 'hidden', textAlign: 'center'},
		content: {flex: '0 1 50px', height: '24px', overflow: 'hidden'}
	},
	decimal: {
		header: {flex: '0 1 80px', height: '24px', overflow: 'hidden', textAlign: 'center'},
		content: {flex: '0 1 80px', height: '24px', overflow: 'hidden'}
	},
	url: {
		header: {flex: '0 1 100px', height: '24px', overflow: 'hidden'},
		content: {flex: '0 1 100px', height: '24px', overflow: 'hidden'}
	},
	status:  {
		header: {flex: '0 1 100px', height: '24px', overflow: 'hidden', textAlign: 'center'},
		content: {flex: '0 1 100px', height: '24px', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center'}
	},
	user: {
		header: {flex: '0 1 110px', height: '24px', overflow: 'hidden', textAlign: 'center'},
		content: {flex: '0 1 110px', height: '24px', overflow: 'hidden'}
	},
	boolean: {
		header: {flex: '0 1 50px', height: '24px', overflow: 'hidden', textAlign: 'center'},
		content: {flex: '0 1 50px', height: '24px', overflow: 'hidden', textAlign: 'center'}
	},
	array: {
		header: {flex: '0 1 200px', height: '24px', overflow: 'hidden'},
		content: {flex: '0 1 200px', height: '24px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}
	},
	roles: {
		header: {flex: '0 1 200px', height: '24px', overflow: 'hidden'},
		content: {flex: '0 1 200px', height: '24px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}
	},
	list: {
		header: {flex: '0 1 100px', height: '24px', overflow: 'hidden'},
		content: {flex: '0 1 100px', height: '24px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}
	},
	foreignList: {
		header: {flex: '0 1 100px', height: '24px', overflow: 'hidden'},
		content: {flex: '0 1 100px', height: '24px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}
	},
}
