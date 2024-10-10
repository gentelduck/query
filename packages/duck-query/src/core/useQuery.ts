import { useState, useMemo, useRef, useCallback, useEffect } from "react";

type Query<T> = {
	queryKey: string;
	queryFn: () => Promise<T>;
	staleTime?: number;
	refetchInterval?: number;
	refetchOnWindowFocus?: boolean;
	gcTime?: number;
	enabled?: boolean;
	retry?: boolean | number
	retryDelay?: number
	initialData?: any
};

type CacheEntry<T> = {
	data: T;
	timestamp: number;
};

type FetchStatus = "fetching" | "idle" | "paused";

type QueryOptions<T> = {
	data: T | null;
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	refetch: () => void;
	isStale: boolean;
	isFetched: boolean;
	isSuccess: boolean;
	fetchStatus: FetchStatus;
};


const cache: Record<string, CacheEntry<unknown>> = {};

export function useQueryNew<T>({
	queryKey,
	queryFn,
	staleTime = 0,
	refetchInterval = 0,
	refetchOnWindowFocus = false,
	gcTime,
	enabled = true,
	retry = 4,
	retryDelay = 2000,
	initialData
}: Query<T>): QueryOptions<T> {
	const [queryState, setQueryState] = useState({
		data: initialData || null as T | null,
		isLoading: false,
		isError: false,
		error: null as unknown,
		isStale: false,
		isFetched: false,
		isSuccess: false,
		fetchStatus: "idle" as FetchStatus
	});

	const key = useMemo(() => JSON.stringify(queryKey), [queryKey]);
	const intervalRef = useRef<number | null>(null);
	const staleCheckRef = useRef<number | null>(null);
	const retriesRef = useRef(0)
	const retriesIntervalRef = useRef<NodeJS.Timeout | null>(null)

	const fetcher = useCallback(async () => {
		const isStale = !cache[key] || (Date.now() - cache[key].timestamp > staleTime);
		if (!enabled && !cache[key]) return;
		if (isStale) {
			setQueryState(prev => ({ ...prev, isLoading: true }));
		}

		setQueryState(prev => ({
			...prev,
			fetchStatus: "fetching",
			isError: false
		}));

		try {
			const result = await queryFn();
			cache[key] = { data: result, timestamp: Date.now() };

			setQueryState(prev => ({
				...prev,
				data: result,
				isSuccess: true,
				error: null
			}));
		} catch (err) {
			setQueryState(prev => ({
				...prev,
				isError: true,
				error: err,
				isSuccess: false
			}));
		} finally {
			setQueryState(prev => ({
				...prev,
				isLoading: false,
				isFetched: true,
				fetchStatus: "idle"
			}));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, key]);

	const clearUnusedCache = useCallback((key: string, gcTime: number) => {
		if (gcTime && cache[key] && Date.now() - cache[key].timestamp > gcTime) {
			delete cache[key];
		}
	}, []);

	const checkStale = useCallback(() => {
		const cachedData = cache[key];
		if (cachedData && Date.now() - cachedData.timestamp > staleTime) {
			fetcher();
		}
	}, [key, staleTime]);

	const refetch = useCallback(() => fetcher(), [fetcher]);

	useEffect(() => {
		if (refetchOnWindowFocus) {
			const handleVisibilityChange = () => {
				const cachedData = cache[key];
				const isStale = !cachedData || (Date.now() - cachedData.timestamp > staleTime);

				if (document.visibilityState === "visible" && isStale) {
					fetcher();
				}
			};

			document.addEventListener("visibilitychange", handleVisibilityChange);
			return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
		}
	}, [key, staleTime, refetchOnWindowFocus, fetcher]);

	useEffect(() => {
		const cachedData = cache[key];
		const isStale = cachedData && Date.now() - cachedData.timestamp > staleTime;

		if (gcTime) clearUnusedCache(key, gcTime);

		if (staleTime > 0 && !staleCheckRef.current) {
			staleCheckRef.current = window.setInterval(checkStale, staleTime);
		}

		if (refetchInterval > 0 && !intervalRef.current) {
			intervalRef.current = window.setInterval(fetcher, refetchInterval);
		}

		if (cachedData && !isStale) {
			if (queryState.data !== cachedData.data) {
				setQueryState(prev => ({
					...prev,
					data: cachedData.data as T,
					isStale: false,
					isSuccess: true
				}));
			}
		} else if (!cachedData || isStale) {
			// Ensure fetcher runs only once when data is stale or absent
			if (!queryState.isLoading) {
				fetcher();
				setQueryState(prev => ({ ...prev, isStale: true }));
			}
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
			if (staleCheckRef.current) {
				clearInterval(staleCheckRef.current);
				staleCheckRef.current = null;
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, staleTime, refetchInterval, gcTime, enabled]);

	useEffect(() => {
		if (!queryState.isError) return;

		retriesRef.current = 0;

		if (retriesIntervalRef.current) {
			clearInterval(retriesIntervalRef.current);
		}

		if ((typeof retry === 'boolean' && retry) || (typeof retry === 'number' && retriesRef.current < retry)) {
			retriesIntervalRef.current = setInterval(() => {
				retriesRef.current += 1;
				fetcher()
				if (typeof retry === 'number' && retriesRef.current >= retry) {
					clearInterval(retriesIntervalRef.current as number);
				}
			}, retryDelay);
		}

		return () => {
			if (retriesIntervalRef.current) {
				clearInterval(retriesIntervalRef.current);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [queryState.isError, retry, retryDelay]);



	const safeData = queryState.data ? queryState.data : ({} as T);

	return {
		data: safeData,
		isLoading: queryState.isLoading,
		isError: queryState.isError,
		refetch,
		error: queryState.error,
		isStale: queryState.isStale,
		isFetched: queryState.isFetched,
		isSuccess: queryState.isSuccess,
		fetchStatus: queryState.fetchStatus
	};
}
