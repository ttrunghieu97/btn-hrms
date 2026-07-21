import type { InfobarContent } from '@/components/ui/infobar';

export const companyInfoContent: InfobarContent = {
  title: 'Quan ly cong ty',
  sections: [
    {
      title: 'Tong quan',
      description:
        'Man hinh nay dung de quan ly thiet lap toan cong ty, cau hinh truy cap va thong tin quan tri. Chuc nang se duoc ket noi voi backend company API trong cac cap nhat tiep theo.',
      links: []
    },
    {
      title: 'Truy cap nhan su',
      description:
        'Ban co the xem cau hinh quan tri va truy cap o cap toan cong ty. Gan vai tro va kiem soat truy cap van duoc backend thuc thi.',
      links: []
    },
    {
      title: 'Vai tro va quyen',
      description:
        'Cau hinh vai tro mac dinh va quyen trong he thong phan quyen backend. Vai tro quy dinh cac thao tac nguoi dung duoc phep thuc hien tren HRMS.',
      links: []
    },
    {
      title: 'Bao mat',
      description:
        'Quan ly yeu cau xac thuc, phien dang nhap va kiem soat truy cap. Cac thiet lap nay giup bao ve du lieu cong ty va tai nguyen noi bo.',
      links: []
    },
    {
      title: 'Thiet lap cong ty',
      description:
        'Cau hinh ten cong ty, logo va cac tuy chon he thong chung. Thiet lap duoc ap dung tren toan bo moi truong HRMS.',
      links: []
    },
    {
      title: 'He thong dieu huong RBAC',
      description:
        'Dieu huong duoc cau hinh tai `src/config/nav-config.ts`. Kiem soat truy cap duoc thuc thi o tang server va API.',
      links: []
    }
  ]
};

export const billingInfoContent: InfobarContent = {
  title: 'Thanh toan va goi su dung',
  sections: [
    {
      title: 'Tong quan',
      description:
        'Man hinh Billing dung de quan ly goi su dung va gioi han tai nguyen. Cac tinh nang thanh toan se duoc ket noi voi backend service.',
      links: []
    },
    {
      title: 'Cac goi hien co',
      description:
        'Xem va quan ly danh sach goi su dung. Giao dien quan ly goi se duoc bo sung trong cap nhat tiep theo.',
      links: []
    },
    {
      title: 'Tinh nang theo goi',
      description:
        'Moi goi co the mo khoa cac tinh nang rieng trong ung dung. Viec kiem tra quyen truy cap duoc backend xu ly.',
      links: []
    },
    {
      title: 'Kiem soat truy cap',
      description:
        'Goi su dung va tinh nang duoc dung de kiem soat truy cap tren toan he thong. Server se xac minh quyen theo goi hoac feature.',
      links: []
    },
    {
      title: 'Cau truc chi phi',
      description:
        'Chi phi thanh toan phu thuoc vao cau hinh tich hop billing tren backend cua ban.',
      links: []
    },
    {
      title: 'Yeu cau thiet lap',
      description:
        'Can cau hinh billing integration trong backend va moi truong deploy.',
      links: []
    },
    {
      title: 'Trang thai beta',
      description:
        'Billing API co the thay doi theo thoi gian; can ghim version phu thuoc va xem release note truoc khi nang cap.',
      links: []
    }
  ]
};

export const productInfoContent: InfobarContent = {
  title: 'Quan ly san pham',
  sections: [
    {
      title: 'Tong quan',
      description:
        'Trang Products cho phep quan ly danh muc san pham. Ban co the xem du lieu theo bang voi sort, filter, pagination va search phia server. Nut them moi dung de tao san pham.',
      links: [{ title: 'Huong dan quan ly san pham', url: '#' }]
    },
    {
      title: 'Them san pham',
      description:
        'De them san pham, bam nut them moi tren header. Bieu mau se cho phep nhap ten, mo ta, gia, danh muc va tep hinh anh.',
      links: [{ title: 'Tai lieu them san pham', url: '#' }]
    },
    {
      title: 'Chinh sua san pham',
      description:
        'Ban co the chinh sua bang cach bam vao dong du lieu. Form chinh sua cho phep cap nhat moi truong thong tin va luu khi gui.',
      links: [{ title: 'Huong dan chinh sua san pham', url: '#' }]
    },
    {
      title: 'Xoa san pham',
      description:
        'San pham co the bi xoa tu bang danh sach. He thong se yeu cau xac nhan truoc khi xoa vinh vien khoi danh muc.',
      links: [{ title: 'Chinh sach xoa san pham', url: '#' }]
    },
    {
      title: 'Tinh nang bang du lieu',
      description:
        'Bang san pham ho tro sort cot, filter, phan trang va tim kiem nhanh de quan ly danh muc lon hieu qua hon.',
      links: [
        { title: 'Tai lieu ve bang du lieu', url: '#' },
        { title: 'Huong dan sort va filter', url: '#' }
      ]
    },
    {
      title: 'Cac truong du lieu',
      description:
        'Moi san pham co the gom: Ten, Mo ta, Gia, Danh muc va Hinh anh. Tat ca truong deu co the cap nhat khi tao hoac sua.',
      links: [{ title: 'Dac ta truong san pham', url: '#' }]
    }
  ]
};
