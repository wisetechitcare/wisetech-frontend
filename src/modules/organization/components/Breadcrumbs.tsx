import { Breadcrumbs as MuiBreadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export interface Crumb {
  id: string;
  label: string;
  /** Omit onClick on the last (current) crumb to render it as plain text. */
  onClick?: () => void;
}

/** Page breadcrumb trail: tenant → … → selected unit. */
export const Breadcrumbs = ({ crumbs, ariaLabel = 'Breadcrumb' }: { crumbs: Crumb[]; ariaLabel?: string }) => (
  <MuiBreadcrumbs
    separator={<NavigateNextIcon fontSize="small" />}
    aria-label={ariaLabel}
    sx={{ mb: 1.5 }}
  >
    {crumbs.map((crumb, i) => {
      const isLast = i === crumbs.length - 1;
      if (isLast || !crumb.onClick) {
        return (
          <Typography key={crumb.id} color="text.primary" sx={{ fontWeight: isLast ? 600 : 400 }} noWrap>
            {crumb.label}
          </Typography>
        );
      }
      return (
        <MuiLink
          key={crumb.id}
          component="button"
          type="button"
          underline="hover"
          color="inherit"
          onClick={crumb.onClick}
          sx={{ font: 'inherit' }}
        >
          {crumb.label}
        </MuiLink>
      );
    })}
  </MuiBreadcrumbs>
);

export default Breadcrumbs;
