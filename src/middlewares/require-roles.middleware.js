export const requireRoles = (roles) => {
    return (req, res, next) => {
      const { role } = req.user;
  
      if (!roles.includes(role)) {
        return res.status(403).json({ message: '접근 권한이 없습니다.' });
      }
  
      next();
    };
  };