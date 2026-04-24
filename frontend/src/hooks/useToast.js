export function useToast() {
  const toast = (props) => {
    console.log('Toast:', props);
  };

  return { toast };
}
