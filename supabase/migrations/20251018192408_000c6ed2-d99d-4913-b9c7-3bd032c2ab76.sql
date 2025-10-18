-- Enable realtime for predictions table so map updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;