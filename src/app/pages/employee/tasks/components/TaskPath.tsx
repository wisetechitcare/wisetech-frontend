import React from 'react';
import { Box } from '@mui/material';

/** How a Project Task path is written into a deliverable name: "Electrical - Document - Load Sheet". */
export const TASK_PATH_SEPARATOR = ' - ';

/**
 * A Project Task path, read left to right: ancestors quiet, the task itself in full weight,
 * so "Electrical - Document - Load Sheet" and "HVAC - Document - Load Sheet" are told apart
 * at a glance. Takes the segments, or a stored name to split on the separator.
 */
const TaskPath: React.FC<{ path: string[] | string; fontSize?: number }> = ({ path, fontSize = 13.5 }) => {
    const parts = Array.isArray(path) ? path : path.split(TASK_PATH_SEPARATOR);
    return (
        <Box component="span" sx={{ fontSize, lineHeight: 1.35, wordBreak: 'break-word' }}>
            {parts.map((part, i) => {
                const leaf = i === parts.length - 1;
                return (
                    <React.Fragment key={i}>
                        {i > 0 && <Box component="span" sx={{ color: 'text.disabled', mx: 0.75 }}>–</Box>}
                        <Box component="span" sx={{ color: leaf ? 'text.primary' : 'text.secondary', fontWeight: leaf ? 600 : 500 }}>
                            {part}
                        </Box>
                    </React.Fragment>
                );
            })}
        </Box>
    );
};

export default TaskPath;
