import { useSearchParams } from 'react-router-dom';

export const useAppScope = () => {
  const [searchParams] = useSearchParams();

  const getScope = () => {
    return {
      platformId: searchParams.get('platform_id') || localStorage.getItem('default_platform_id') || '',
      deptId: searchParams.get('dept_id') || '',
      shopId: searchParams.get('shop_id') || '',
    };
  };

  return getScope();
};
