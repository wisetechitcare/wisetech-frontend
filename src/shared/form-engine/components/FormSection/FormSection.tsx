import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Box, Typography } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

interface FormSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/** @deprecated New forms use FormSection from the UI kit. */
export function FormSection({ id, title, subtitle, isOpen, onToggle, icon, children }: FormSectionProps) {
  return (
    <Accordion id={id} expanded={isOpen} onChange={onToggle} disableGutters elevation={0} sx={{ mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, '&::before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMore />} aria-controls={id + '-content'} id={id + '-header'}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          {icon && <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>}
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{title}</Typography>
            {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails id={id + '-content'}>{children}</AccordionDetails>
    </Accordion>
  );
}

export default FormSection;
