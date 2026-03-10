import { createChart, ColorType } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

export const BarChartComponent = (props: any) => {
    const {
        data,
        colors: {
            positiveColor = '#10B981',
            negativeColor = '#EF4444',
            textColor = '#D9D9D9',
        } = {},
    } = props;
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: 200,
            grid: {
                vertLines: { visible: false },
                horzLines: { color: '#1f2937' },
            },
        });
        chart.timeScale().fitContent();
        chartRef.current = chart;

        const series = chart.addHistogramSeries({
            priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });

        if (data && data.length > 0) {
            series.setData(
                data.map((d: any) => ({
                    time: d.time,
                    value: d.value,
                    color: d.value >= 0 ? positiveColor : negativeColor,
                }))
            );
        }

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartRef.current = null;
        };
    }, [data, positiveColor, negativeColor, textColor]);

    return <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />;
};

export const ChartComponent = (props: any) => {
    const {
        data,
        colors: {
            backgroundColor = 'transparent',
            lineColor = '#2962FF',
            textColor = '#D9D9D9',
            areaTopColor = '#2962FF',
            areaBottomColor = 'rgba(41, 98, 255, 0.28)',
        } = {},
    } = props;
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);

    // Initialize chart once
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
        });
        chart.timeScale().fitContent();
        chartRef.current = chart;

        const newSeries = chart.addAreaSeries({ lineColor, topColor: areaTopColor, bottomColor: areaBottomColor });
        seriesRef.current = newSeries;

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, []); // Empty deps so it only runs once per mount

    // Update colors if they change
    useEffect(() => {
        if (chartRef.current && seriesRef.current) {
            chartRef.current.applyOptions({
                layout: { background: { type: ColorType.Solid, color: backgroundColor }, textColor }
            });
            seriesRef.current.applyOptions({ lineColor, topColor: areaTopColor, bottomColor: areaBottomColor });
        }
    }, [backgroundColor, textColor, lineColor, areaTopColor, areaBottomColor]);

    // Update data seamlessly
    useEffect(() => {
        if (seriesRef.current && data) {
            // Lightweight charts strictly needs unique time sorted data. To prevent errors if the data array length is 0, we can check.
            if (data.length > 0) {
                seriesRef.current.setData(data);
            }
        }
    }, [data]);

    return (
        <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
    );
};
