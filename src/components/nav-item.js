import {A, usePath} from 'hookrouter';
import PropTypes from 'prop-types';
import { Box, Button, ListItem } from '@mui/material';
import { useIntl } from 'react-intl';

export const NavItem = (props) => {
  const { href, icon, title, ...others } = props;
  const path = usePath();
  const active = href ? (path === href) : false;

  const intl = useIntl();
  return (
    <ListItem
      disableGutters
      sx={{
        display: 'flex',
        mb: 0.5,
        py: 0,
        px: 2
      }}
      {...others}
    >
      <A style={{width: '100%'}} href={href} >
        <Button
          component="span"
          startIcon={icon}
          disableRipple
          sx={{
            backgroundColor: active && 'rgba(255,255,255, 0.08)',
            borderRadius: 1,
            color: active ? 'secondary.main' : 'neutral.300',
            fontWeight: active && 'fontWeightBold',
            justifyContent: 'flex-start',
            px: 3,
            textAlign: 'left',
            textTransform: 'none',
            width: '100%',
            '& .MuiButton-startIcon': {
              color: active ? 'secondary.main' : 'neutral.400'
            },
            '&:hover': {
              backgroundColor: 'rgba(255,255,255, 0.08)'
            }
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            {intl.formatMessage({id: title})}
          </Box>
        </Button>
      </A>
    </ListItem>
  );
};

NavItem.propTypes = {
  href: PropTypes.string,
  icon: PropTypes.node,
  title: PropTypes.string
};
