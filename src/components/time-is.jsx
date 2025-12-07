import { Typography, Box } from "@mui/material";
import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";

export const TimeIs = ({sx}) => {
    const [useFallback, setUseFallback] = useState(false);
    const [time, setTime] = useState(new Date());
    const initializedRef = useRef(false);

    useEffect(() => {
        // Function to load the Time.is script
        const loadScript = () => {
            if (initializedRef.current) return;
            initializedRef.current = true;

            const script = document.createElement("script");
            script.src = "//widget.time.is/t.js";
            script.async = true;

            script.onload = () => {
                // Initialize the widget once the script is loaded
                if (window.time_is_widget) {
                    window.time_is_widget.init({ Hanoi_z40a: {} });

                    // Check if widget successfully rendered time after a short delay
                    setTimeout(() => {
                        const widgetEl = document.getElementById("Hanoi_z40a");
                        // If element is empty or doesn't look like time (e.g. empty string), fallback.
                        if (!widgetEl || !widgetEl.textContent.trim()) {
                            console.warn("Time.is widget didn't render content, falling back.");
                            setUseFallback(true);
                        }
                    }, 2500);
                }
            };

            script.onerror = () => {
                console.warn("Failed to load time.is widget, falling back to local time.");
                setUseFallback(true);
            };

            document.body.appendChild(script);
        };

        // Try to load script
        loadScript();

        // Establish strict fallback timeout (if script hangs but doesn't error immediately?
        // useful if network is slow but not completely down, but for now onerror is enough for "no internet")
        // actually onerror catches DNS failure/ERR_INTERNET_DISCONNECTED.

        return () => {
            // Cleanup if necessary, though removing script tag doesn't undo execution.
        };
    }, []);

    // Effect for the fallback clock
    useEffect(() => {
        let timer;
        if (useFallback) {
            timer = setInterval(() => {
                setTime(new Date());
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [useFallback]);

    if (useFallback) {
        return (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...sx
        }}>
             <Typography
                variant="h5"
                sx={{
                    fontWeight: 'bold',
                    fontSize: '18px !important',
                    letterSpacing: 2,
                    color: 'text.primary',
                    opacity: 0.9,
                    whiteSpace: 'nowrap'
                }}
            >
                {format(time, "HH:mm:ss")}
            </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '& span': {
                fontWeight: 'bold',
                fontSize: '18px !important', // Override inline style from widget if needed to fit navbar better, or stick to 36px if user wants big
                color: 'text.primary',
                opacity: 0.9
            },
            ...sx
        }}>
            {/* The ID must match the one in init() */}
            <a href="https://time.is/Hanoi" id="time_is_link" rel="nofollow" style={{ fontSize: '24px' }}></a>
            <span id="Hanoi_z40a" style={{ fontSize: '24px' }}></span>
        </Box>
    );
};
