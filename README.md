Node js 를 이용하여 제작한 백엔드 이력서 관리 기능 api입니다
 
사용기술:  MySQL(Aws RDS), Prisma, Nodejs, jsonwebtoken, cookie-parser, express, bcrypt

API 명세서: https://brash-bow-29e.notion.site/0f9657e57ced4d999266fcf7da3bbc22?v=50c733c6778944b68ddbe4b90990f37f&pvs=4 

ERD: https://dbdiagram.io/d/6650535af84ecd1d220ab5b3



해당 Resume-management을 이용하기 위해서는 Aws에서 제공하는 RDS를 생성한 후 MYSQL 데이터베이스를 생성시켜줍니다 그리고 .env파일을 생성하여
DATABASE_URL="mysql://id:password@엔드포인트:포트번호/프로젝트 이름" 을 넣어주세요

JWT_SECRET= 원하는 엑세스 토큰키를 넣어주세요 ex) token

JWT_REFRESH = 원하는 리프레시 토큰키를 넣어주세요 ex)token

SALT_ROUNDS= hash값을 몇번 돌리실지 넣어주세요 ex)10

프로젝트를 실행하기 위해 필요한 모듈을 설치해주세요

npm install -g yarn

yarn init -y

yarn add express prisma @prisma/client cookie-parser jsonwebtoken

yarn add bcrypt

yarn add -D nodemon

yarn add -D dotenv

npx prisma init

npx prisma db push

여기까지하면 정상적으로 사용자의 mysql데이터베이스에 테이블이 생성됩니다

그후 app.js를 실행시키시면 사용이 가능합니다 node app.js

해당기능은 백엔드로만 구현이 되있기 때문에 insomnia에서 테스트를 해보실수있습니다 테스트를 하는방법은 위 명세서에 자세히 나와있으니 참고해주세요



