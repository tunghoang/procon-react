import PropTypes from 'prop-types';
import { Box, Drawer, Divider, Typography, useMediaQuery } from '@mui/material';
import { Cog as CogIcon } from '../icons/cog';
import { Logo } from './logo';
import { NavItem } from './nav-item';

import { A } from 'hookrouter';
import { Laboratory as LaboratoryIcon } from '../icons/laboratory';
import { Book as BookIcon } from '../icons/book';
import { Child as ChildIcon } from '../icons/child';
import { Education as EducationIcon } from '../icons/education';
import { Blackboard as BlackboardIcon } from '../icons/blackboard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';  
import { useContext } from 'react';
import Context from '../context';

const items = [
  {
    href: '/',
    icon: (<BookIcon fontSize="small" />),
    title: 'Teams'
  },
  {
    href: '/tournaments',
    icon: (<EducationIcon fontSize="small" />),
    title: 'Tournaments'
  },
  {
    href: '/rounds',
    icon: (<ChildIcon fontSize="small" />),
    title: 'Rounds'
  },
  {
    href: '/matches',
    icon: (<BlackboardIcon fontSize="small" />),
    title: 'Matches'
  }
];

export const DashboardSidebar = (props) => {
  const { updateContext } = useContext(Context);
  const { open, onClose } = props;
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up('lg'), {
    defaultMatches: true,
    noSsr: true
  });


  const content = (
    <>
      <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }} >
        <div>
          <Box sx={{ p: 3 }}>
            <A href="/" >
                <Logo sx={{
                    height: 42,
                    width: 42
                  }} />
            </A>
          </Box>
        </div>
        <Box sx={{ flexGrow: 1 }}>
          {items.map((item) => ( <NavItem key={item.title} icon={item.icon} href={item.href} title={item.title} />))}
          <Divider light={true} />
        </Box>
      </Box>
    </>
  );

  if (lgUp) {
    return (
      <Drawer anchor="left" open PaperProps={{
          sx: {
            backgroundColor: 'neutral.900',
            color: '#FFFFFF',
            width: 280
          }
        }}
        variant="permanent"> 
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer anchor="left" onClose={onClose} open={open} PaperProps={{
        sx: {
          backgroundColor: 'neutral.900',
          color: '#FFFFFF',
          width: 280
        }
      }}
      sx={{ zIndex: (theme) => theme.zIndex.appBar + 100 }} variant="temporary"
    >
      {content}
    </Drawer>
  );
};

DashboardSidebar.propTypes = {
  onClose: PropTypes.func,
  open: PropTypes.bool
};
